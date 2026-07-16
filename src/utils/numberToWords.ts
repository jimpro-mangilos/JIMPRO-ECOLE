const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
const dix_a_dix_neuf = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];

function convertirNombreMoins1000(n: number): string {
  if (n === 0) return '';

  let resultat = '';

  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  const dizaine = Math.floor(reste / 10);
  const unite = reste % 10;

  if (centaines > 0) {
    if (centaines === 1) {
      resultat += 'cent';
    } else {
      resultat += unites[centaines] + ' cent';
    }
    if (reste === 0 && centaines > 1) {
      resultat += 's';
    }
  }

  if (reste >= 10 && reste < 20) {
    if (resultat) resultat += ' ';
    resultat += dix_a_dix_neuf[reste - 10];
  } else {
    if (dizaine > 0) {
      if (resultat) resultat += ' ';
      resultat += dizaines[dizaine];

      if (dizaine === 7 || dizaine === 9) {
        if (unite === 1) {
          resultat += ' et onze';
        } else if (unite > 1) {
          resultat += '-' + dix_a_dix_neuf[unite];
        } else {
          resultat += '-dix';
        }
      } else {
        if (unite === 1 && dizaine < 8) {
          resultat += ' et un';
        } else if (unite > 0) {
          if (dizaine === 8 && unite === 0) {
            resultat += 's';
          } else {
            resultat += '-' + unites[unite];
          }
        } else if (dizaine === 8) {
          resultat += 's';
        }
      }
    } else if (unite > 0) {
      if (resultat) resultat += ' ';
      resultat += unites[unite];
    }
  }

  return resultat;
}

export function montantEnLettres(montant: number): string {
  if (montant === 0) return 'zéro franc congolais';

  const parties = montant.toFixed(2).split('.');
  const entier = parseInt(parties[0]);
  const decimales = parseInt(parties[1]);

  let resultat = '';

  if (entier === 0) {
    resultat = 'zéro';
  } else {
    const milliards = Math.floor(entier / 1000000000);
    const millions = Math.floor((entier % 1000000000) / 1000000);
    const milliers = Math.floor((entier % 1000000) / 1000);
    const centaines = entier % 1000;

    if (milliards > 0) {
      const txtMilliards = convertirNombreMoins1000(milliards);
      resultat += txtMilliards + (milliards === 1 ? ' milliard' : ' milliards');
    }

    if (millions > 0) {
      if (resultat) resultat += ' ';
      const txtMillions = convertirNombreMoins1000(millions);
      resultat += txtMillions + (millions === 1 ? ' million' : ' millions');
    }

    if (milliers > 0) {
      if (resultat) resultat += ' ';
      if (milliers === 1) {
        resultat += 'mille';
      } else {
        resultat += convertirNombreMoins1000(milliers) + ' mille';
      }
    }

    if (centaines > 0) {
      if (resultat) resultat += ' ';
      resultat += convertirNombreMoins1000(centaines);
    }
  }

  resultat += ' franc';
  if (entier > 1) resultat += 's';
  resultat += ' congolais';

  if (decimales > 0) {
    resultat += ' et ' + convertirNombreMoins1000(decimales) + ' centime';
    if (decimales > 1) resultat += 's';
  }

  return resultat.charAt(0).toUpperCase() + resultat.slice(1);
}
