# Õpetaja assistent

Pivotal Tracker: [https://www.pivotaltracker.com/n/projects/2645015](https://www.pivotaltracker.com/n/projects/2645015)

## Eesmärk

„Õpetaja assistent“ on Chrome'i laiendus, mis on loodud selleks, et aidata õpetajatel õppeinfosüsteemis rühmade
päevikuid kontrollida ja nendes esinevaid puudujääke, nagu puuduolevad tunnid või määramata lõpphinded, automaatselt
kõrvaldada. Laiendus tuvastab ja tõstab esile puuduolevad tunnid ja hinded, andes ühtlasi ülevaate ainete lõpetamise
staatusest ja paljust muust. See on mõeldud olema tõhus vahend õpetajatele, muutes nende töö lihtsamaks ja
korraldatumaks.

Hetkel on toetatud tahvel.edu.ee, kuid Siseveebi tugi on ka plaanis luua kunagi, kui keegi soovib seda.

## Paigaldamine
Järgi neid samme assistendi paigaldamiseks:

1. Laadi alla repo
2. Ava Chrome'i laienduste haldur aadressil `chrome://extensions/`
3. Lülita sisse arendaja režiim (Developer Mode)
4. Klõpsa Chrome'i laienduste halduris nuppu `Load unpacked` (avaneb kausta valimise dialoog)
5. Vali kaustaks `build/chrome-mv3-prod` kaust
6. Külasta oma õppeinfosüsteemi päevikute loendi vaadet (peaksid nägema, et lehel on midagi muutunud)

## Võimalused:

**Puuduvate tundidega seotud võimalused:**
- [ ] Kui päevikute loendis on päevikuid, millel on vähemalt üks juba möödunud tund puudu, peaks selleni viiva lingi juures olema punane silt "Puuduvad tunnid".
- [ ] Kui päevik avada, peaks ilmuma teade, milles on loend puuduvatest tundidest ja nupp, mille vajutamisel saab puuduvad tunnid päevikusse lisada.
- [ ] Päevikute loendi vaates on uus tulp "Kokku", milles on kõikide perioodide antud/kokku tunnid kumulatiivselt summeeritud.
- [ ] Päevikute loendi vaates on loendi all "kokku" real kumulatiivne kokku loendur.

**Puuduvate hinnetega seotud võimalused:**
- [ ] Kui päevikute loendis on lõppenud aineid, millel on vähemalt ühel õpilasel vähemalt üks hinne puudu, peaks selleni viiva lingi juures olema punane silt "Puuduvad hinded".
- [ ] Kui päevik avada, peaks ilmuma teade, milles on loend puuduvatest hinnetest ja nupp, mille vajutamisel saab puuduvad hinded päevikusse lisada.

**Ainete lõppemisega seotud võimalused:**
- [ ] Päevikud lehe tabelis on juba äralõppenud ained halli värviga, et kohe näeks, millised ained on juba läbi ja millised veel järel, et tegeleda lõppenud aine antud vs planeeritud tundide ebakõlaga, kui seda peaks juhtuma.
- [ ] Päevikud lehe tabelis on uus tulp, mis annab ülevaate, kui palju aega on jäänud antud aine lõpuni. Esialgsed andmed selleks võetakse koormuste tabelist, mis pakub nädala täpsusega andmeid, sest tunniplaanis on tavaliselt ainult mõne järgneva nädala jagu tunde. Kui koormuste tabel näitab, et aine lõpuni on jäänud vaid viimane nädal, siis uuritakse tunniplaanist, mis kuupäeval see aine viimasena tunniplaanis on. Kuni viimase nädalani on selles tulbas arv, mis annab teada, mitu nädalat on veel jäänud (4n, 3n, 2n, 1n), ja alates viimasest nädalast näidatakse päeva täpsusega rasvases kirjas (näiteks, kui aine viimane tund on reedel, siis esmaspäeval näitab 4p, teisipäeval 3p, kolmapäeval 2p, neljapäeval 1p, reedel on punases kirjas "täna"). Pärast seda näidatakse kuupäeva, millal aine lõppes (näiteks 9.5.22).

**Käsunduslepinguga töötajatele:**
- [ ] Päevikud lehe tabelil on nurgas hammasratta ikoon, mille alt avaneb aken, kust saab linnukestega kontrollida, millist tüüpi tunde tabelis kuvatakse (“kontakt" ehk teoreetiline+praktiline, "e-õpe" ja “iseseisev"), et ei peaks arve loomisel vaeva nägema, et saada kätte iga aine kohta eraldi kontakttundide arv ja e-õppe tundide arv (kuna nad on erineva hinnaga).


## Arendusversiooni kasutamine
Arendusversioon on mõeldud arendajatele, kes soovivad muuta koodi. Pull requestid on teretulnud.

See projekt on ehitatud [Plasmo](https://docs.plasmo.com/) baasile.

### Nõuded
See projekt kasutab [pnpm](https://pnpm.io/) paketihaldurit, mis on [npm](https://www.npmjs.com/)i alternatiiv. Kui sa eelistad npm-i, siis saad selle asemel kasutada npm-i, aga siis tuleb käskudest `pnpm` asendada `npm`-iga.
- [Node.js](https://nodejs.org/en/) (versioon 14 või uuem)
- [pnpm](https://pnpm.io/) (versioon 6 või uuem)
- [Chrome](https://www.google.com/chrome/) (versioon 92 või uuem)

### Sõltuvuste paigaldamine (esmakordsel kasutamisel)
Selleks, et arendusversiooni käivitada, tuleb kõigepealt paigaldada sõltuvused:
```bash
pnpm install
```

### Arendusserveri käivitamine (igakordsel kasutamisel)
Arendusserveri käivitamiseks tuleb käivitada järgmine käsk:
```bash
pnpm dev
```

### Laienduse paigaldamine Chrome'i (esmakordsel kasutamisel)
Arendusversioon tekib kausta `build/chrome-mv3-dev`. Sellest kaustast saab laadida Chrome'i laienduse sama moodi nagu tootmisversiooni puhul:
1. Klõpsa Chrome'i laienduste halduris nuppu `Load unpacked` (avaneb kausta valimise dialoog)
2. Vali kaustaks `build/chrome-mv3-dev` kaust
3. Külasta oma õppeinfosüsteemi päevikute loendi vaadet

### Panustamine
Kui oled midagi vahvat teinud, ära unusta seda ka teistega jagamast!
1. Täienda README faili
2. Käivita `pnpm build` või `npm run build`
3. Testi oma muudatusi laadides laiendi `build/chrome-mv3-dev` kaustast.
4. Tee pull request
