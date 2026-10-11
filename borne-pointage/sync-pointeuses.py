#!/usr/bin/env python3
"""
sync-pointeuses.py — Pont « Pointeuses ZKTeco ↔ JIMPRO (Supabase) »

Récupère les pointages des pointeuses ZKTeco (port 4370) et les envoie à
JIMPRO via la fonction RPC pointer_personnel_borne() — la MÊME logique
arrivée → départ → déjà complet que le portail web.

Correspondance employé :
  - Sur la pointeuse, chaque employé possède un user_id (numéro enrôlé sur
    l'appareil, ex. 12).
  - Dans JIMPRO, on relie ce user_id au membre via la table empreintes_personnel :
      empreinte_ref = str(user_id), appareil_id = identifiant de la pointeuse.
    → à faire dans l'app : Pointage du personnel → bouton « Empreintes ».

Sécurité :
  - Utilise la clé ANON (jamais la clé service role sur une pointeuse).
  - Se connecte avec un compte utilisateur DÉDIÉ (BORNE_EMAIL/PASSWORD),
    jamais avec la clé service role.
  - Clés lues depuis .env (jamais en dur dans le code).

Installation :
  pip install -r requirements.txt   # pyzk + supabase

Configuration :
  cp .env.example .env             # puis renseigner SUPABASE_URL / ANON_KEY / ECOLE_ID
  # Adapter la liste DEVICES ci-dessous (IP + appareil_id de chaque pointeuse).

Usage :
  python3 sync-pointeuses.py           # boucle continue (intervalle POLL_SECONDS)
  python3 sync-pointeuses.py --once    # une seule passe puis quitte (cron)
"""

import os
import sys
import json
import time
from pathlib import Path

try:
    from zk import ZK
except ImportError:
    sys.exit("Dépendance manquante : pip install pyzk")
try:
    from supabase import create_client
except ImportError:
    sys.exit("Dépendance manquante : pip install supabase")

BASE_DIR = Path(__file__).resolve().parent

# ── Pointeuses : adapter IP / identifiant d'appareil ────────────────────────
# appareil_id doit correspondre au champ « Appareil » saisi lors de
# l'enrôlement des empreintes dans l'app (un identifiant par pointeuse).
DEVICES = [
    {"ip": "192.168.1.78", "appareil_id": "borne1", "port": 4370},
    {"ip": "192.168.1.239", "appareil_id": "borne2", "port": 4370},
]

TIMEOUT = 5

# ── Fichiers locaux (dans le dossier du script) ─────────────────────────────
LAST_SYNC_FILE = BASE_DIR / "last-sync.json"      # dernier pointage synchronisé par appareil
QUEUE_FILE = BASE_DIR / "queue-offline.json"      # pointages en attente (réseau coupé)


def load_env():
    """Charge .env (KEY=VALUE) sans écraser les variables d'environnement existantes."""
    env_file = BASE_DIR / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


load_env()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
# Corrige l'erreur fréquente d'URL se terminant par /rest/v1 (double /rest/v1).
if SUPABASE_URL.endswith("/rest/v1"):
    SUPABASE_URL = SUPABASE_URL[: -len("/rest/v1")]
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
ECOLE_ID = os.getenv("ECOLE_ID", "").strip()
BORNE_EMAIL = os.getenv("BORNE_EMAIL", "").strip()
BORNE_PASSWORD = os.getenv("BORNE_PASSWORD", "").strip()
POLL_SECONDS = int(os.getenv("POLL_SECONDS", "10") or 10)
DEVICE_PASSWORD = int(os.getenv("DEVICE_PASSWORD", "0") or 0)

if not SUPABASE_URL or not SUPABASE_ANON_KEY or not ECOLE_ID or not BORNE_EMAIL or not BORNE_PASSWORD:
    sys.exit("Configuration incomplète — renseignez .env (voir .env.example)")

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


# ── Helpers fichiers JSON ───────────────────────────────────────────────────
def lire_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def ecrire_json(path, data):
    try:
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"⚠️ Impossible d'écrire {path.name} : {e}")


def lire_file():
    return lire_json(QUEUE_FILE, [])


def ecrire_file(q):
    ecrire_json(QUEUE_FILE, q)


def lire_last_sync():
    return lire_json(LAST_SYNC_FILE, {})


def ecrire_last_sync(d):
    ecrire_json(LAST_SYNC_FILE, d)


# ── Correspondance empreinte ↔ personnel + envoi ────────────────────────────
def trouver_personnel(appareil_id, empreinte_ref):
    """Retrouve le personnel_id via empreintes_personnel (empreinte_ref = str(user_id))."""
    try:
        res = (
            supabase.table("empreintes_personnel")
            .select("personnel_id")
            .eq("ecole_id", ECOLE_ID)
            .eq("appareil_id", appareil_id)
            .eq("empreinte_ref", empreinte_ref)
            .execute()
        )
        rows = res.data
        if isinstance(rows, dict):
            rows = [rows] if rows else []
        if rows:
            return rows[0].get("personnel_id")
    except Exception as e:
        print(f"  ⚠️ Erreur de correspondance empreinte : {e}")
    return None


def envoyer_pointage(personnel_id, date_str, heure_str):
    """Appelle la fonction SQL pointer_personnel_borne() (arrivée/départ)."""
    res = supabase.rpc("pointer_personnel_borne", {
        "p_ecole": ECOLE_ID,
        "p_personnel": personnel_id,
        "p_date": date_str,
        "p_heure": heure_str,
        "p_source": "empreinte",
    }).execute()
    return res.data  # 'arrivee:present' | 'arrivee:retard' | 'depart' | 'deja_complet'


def rejouer_file():
    """Rejoue les pointages mis en attente pendant une coupure réseau."""
    q = lire_file()
    if not q:
        return
    restantes = []
    for item in q:
        try:
            r = envoyer_pointage(item["personnel_id"], item["date"], item["heure"])
            print(f"  ↻ rejoué depuis la file : {item['personnel_id']} → {r}")
        except Exception as e:
            restantes.append(item)
            print(f"  ⚠️ file en attente : {e}")
    ecrire_file(restantes)


def traiter_attendance(att, appareil_id):
    """Envoie UN pointage. user_id → personnel_id via empreintes_personnel."""
    user_id = getattr(att, "user_id", None)
    ts = getattr(att, "timestamp", None)
    if user_id is None or ts is None:
        return
    ref = str(user_id)
    date_str = ts.strftime("%Y-%m-%d")
    heure_str = ts.strftime("%H:%M:%S")

    personnel_id = trouver_personnel(appareil_id, ref)
    if not personnel_id:
        print(f"  ✋ user_id {user_id} non enrôlé ({appareil_id}) — relier dans l'app (Empreintes)")
        return

    try:
        resultat = envoyer_pointage(personnel_id, date_str, heure_str)
        print(f"  ✓ user_id {user_id} → {resultat} ({date_str} {heure_str})")
    except Exception as e:
        print(f"  ✗ user_id {user_id} : {e} — mis en file d'attente")
        q = lire_file()
        q.append({"personnel_id": personnel_id, "date": date_str, "heure": heure_str})
        ecrire_file(q)


def sync_appareil(device):
    ip = device["ip"]
    appareil_id = device.get("appareil_id", "borne1")
    port = int(device.get("port", 4370))

    zk = ZK(
        ip,
        port=port,
        timeout=TIMEOUT,
        password=DEVICE_PASSWORD,
        force_udp=False,
        ommit_ping=False,
    )
    conn = None
    try:
        conn = zk.connect()
        attendances = conn.get_attendance()
        print(f"--- {ip} ({appareil_id}) : {len(attendances)} pointage(s) ---")

        last_sync = lire_last_sync()
        dernier = last_sync.get(ip)  # 'YYYY-MM-DDTHH:MM:SS' ou None
        max_ts = dernier
        nb_ignores = 0

        for att in attendances:
            ts = getattr(att, "timestamp", None)
            if ts is None:
                continue
            cle = ts.strftime("%Y-%m-%dT%H:%M:%S")
            # Déduplication : ne renvoie que les pointages plus récents que le
            # dernier synchronisé pour cette pointeuse.
            if dernier and cle <= dernier:
                nb_ignores += 1
                continue
            traiter_attendance(att, appareil_id)
            if max_ts is None or cle > max_ts:
                max_ts = cle

        if max_ts:
            last_sync[ip] = max_ts
            ecrire_last_sync(last_sync)
        if nb_ignores:
            print(f"  ({nb_ignores} déjà synchronisé(s) ignoré(s))")
    except Exception as e:
        print(f"✗ Connexion à {ip} impossible : {e}")
    finally:
        if conn:
            try:
                conn.disconnect()
            except Exception:
                pass


def sync_all():
    rejouer_file()
    for device in DEVICES:
        sync_appareil(device)


def authentifier():
    """Connexion du compte dédié « borne » (le client rafraîchit ensuite le jeton)."""
    supabase.auth.sign_in_with_password({"email": BORNE_EMAIL, "password": BORNE_PASSWORD})


def main():
    try:
        authentifier()
    except Exception as e:
        sys.exit(f"Authentification du compte borne échouée : {e}")
    print(f"✅ Pont pointeuses → JIMPRO démarré ({len(DEVICES)} appareil(s)) — Ctrl+C pour arrêter")
    if "--once" in sys.argv or POLL_SECONDS <= 0:
        sync_all()
        return
    while True:
        sync_all()
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nArrêt demandé.")
