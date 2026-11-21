# Resell Radar

Resell Radar est une application **locale** de recherche d’opportunités eBay. Elle compare des annonces actives avec des ventes terminées fournies par l’API configurée pour estimer une marge prudente. Elle ne déploie rien, ne stocke pas de clé et ne publie pas tes recherches.

## Lancer l’application

Dans PowerShell, à la racine du dépôt :

```powershell
$env:EBAY_SOLD_API_KEY = "ta-clé"
node local-server.js
```

Ouvre ensuite `http://127.0.0.1:8888`. La clé ne vit que dans cette fenêtre PowerShell ; elle n’est écrite dans aucun fichier. Sans clé, l’interface s’ouvre mais le scanner indique clairement qu’il est indisponible.

## Utilisation

1. Ajoute une référence eBay aussi précise que possible, son marché et son état.
2. Choisis la marge nette minimale, la commission estimée et les autres frais.
3. Lance le radar.
4. Examine les liens eBay avant tout achat.

Les cibles, l’historique des dix derniers scans et les alertes restent dans le stockage local du navigateur. Tu peux exporter les cibles et le rapport JSON. Les alertes navigateur sont facultatives et ne fonctionnent que lorsque l’application est ouverte.

## Garde-fous

- une opportunité requiert au moins trois ventes terminées comparables ;
- les comparables doivent être dans la même devise et avoir une livraison connue ;
- le bénéfice affiché s’appuie sur le premier quartile (Q1) des ventes, pas uniquement leur médiane ;
- les enchères actives, lots et incompatibilités explicites d’édition, plate-forme ou état sont écartés ;
- aucune donnée d’exemple n’est affichée comme une donnée réelle.

Le radar est un outil de présélection, pas une recommandation d’achat : vérifier manuellement l’édition exacte, l’état, le contenu et le prix proposé reste indispensable.

## Exécution sans interface

Copie `radar-targets.example.json` vers `radar-targets.json`, adapte les cibles, puis lance :

```powershell
node radar-runner.js radar-targets.json
```

Le rapport JSON est écrit sur la sortie standard. `radar-targets.json` est ignoré par Git.

## Tests

```powershell
node --test netlify/functions/lib/tests/*.test.js
```

