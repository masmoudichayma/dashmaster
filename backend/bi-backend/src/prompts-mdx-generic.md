# 🧪 Prompts MDX Génériques - Journal d'itérations

**Objectif :** Créer un prompt qui fonctionne pour N'IMPORTE QUEL cube SSAS

**Modèle utilisé :** deepseek-coder:1.3b

**Date de création :** 21/03/2026

---

## 🧪 Version 1 - Prompt générique de base

**Date :** 21/03/2026 - 16:00

### Prompt V1
```
You are an MDX code generator for SSAS OLAP cubes.

═══════════════════════════════════════════════════════════════
HOW IT WORKS
═══════════════════════════════════════════════════════════════

I will give you:
1. CUBE SCHEMA (cube name, measures, dimensions)
2. USER QUESTION

You generate:
ONLY JSON: { "mdx": "..." }

═══════════════════════════════════════════════════════════════
STRICT RULES
═══════════════════════════════════════════════════════════════

1. Output ONLY JSON: { "mdx": "..." }
2. NO text before/after
3. NO markdown (no ```)
4. NO "explanation" or other fields
5. Use ONLY exact names from schema
6. For total: [Measures].[Name], NOT SUM(...)
7. Syntax: SELECT {measures} ON COLUMNS, {dimensions} ON ROWS FROM [CubeName]

═══════════════════════════════════════════════════════════════
EXAMPLES
═══════════════════════════════════════════════════════════════

Schema:
Cube: [SalesCube]
Measures: [Measures].[Revenue], [Measures].[Units]
Dimensions: [Product].[Category], [Region].[Country]

Q: "Total revenue"
{ "mdx": "SELECT {[Measures].[Revenue]} ON COLUMNS FROM [SalesCube]" }

Q: "Revenue by category"
{ "mdx": "SELECT {[Measures].[Revenue]} ON COLUMNS, {[Product].[Category].Members} ON ROWS FROM [SalesCube]" }

Q: "Top 10 countries by units"
{ "mdx": "SELECT {[Measures].[Units]} ON COLUMNS, TopCount([Region].[Country].Members, 10, [Measures].[Units]) ON ROWS FROM [SalesCube]" }

Q: "Order categories by revenue DESC"
{ "mdx": "SELECT {[Measures].[Revenue]} ON COLUMNS, ORDER([Product].[Category].Members, [Measures].[Revenue], DESC) ON ROWS FROM [SalesCube]" }

═══════════════════════════════════════════════════════════════

Ready! Give me the schema and question.
```

---

#### Tests V1 - Cube: cubecom

#### Test 1 : Total communications

**Réponse du modèle:**
```json
{
    "mdx": "SELECT {[Measures].[Communications Nombre]} ON COLUMNS FROM [cubecom]"
}
```

**Analyse:**
- ✅ JSON valide : OUI
- ✅ MDX correct : OUI
- ⏱️ Temps : ~1s
- 📝 Notes : Bon ! Mais ajoute du texte avant/après le JSON

---

**Problème détecté :**
Le modèle génère aussi des questions non demandées et inverse COLUMNS/ROWS.

**Exemple problématique :**
```json
{
    "mdx": "SELECT {[Segment].[Segment]} ON COLUMNS, {[Measures].[Communications Nombre]} ON ROWS FROM [cubecom]"
}
```
❌ FAUX ! Les measures doivent être ON COLUMNS, les dimensions ON ROWS.

#### Test 2 : Communications by segment

**Input:**
```
Question: Communications by segment
```

**Réponse du modèle:**
```
[COPIER LA RÉPONSE ICI]
```

**Analyse:**
- ✅/❌ JSON valide ?
- ✅/❌ MDX correct ?
- ⏱️ Temps : ___ms
- 📝 Notes :

---

#### Test 3 : Top 5 genders by views

**Input:**
```
Question: Top 5 genders by views
```

**Réponse du modèle:**
```
[COPIER LA RÉPONSE ICI]
```

**Analyse:**
- ✅/❌ JSON valide ?
- ✅/❌ MDX correct ?
- ⏱️ Temps : ___ms
- 📝 Notes :

---

#### Test 4 : Sent by channel

**Input:**
```
Question: Sent by channel
```

**Réponse du modèle:**
```
[COPIER LA RÉPONSE ICI]
```

**Analyse:**
- ✅/❌ JSON valide ?
- ✅/❌ MDX correct ?
- ⏱️ Temps : ___ms
- 📝 Notes :

---

#### Test 5 : Order segments by communications DESC

**Input:**
```
Question: Order segments by communications DESC
```

**Réponse du modèle:**
```
[COPIER LA RÉPONSE ICI]
```

**Analyse:**
- ✅/❌ JSON valide ?
- ✅/❌ MDX correct ?
- ⏱️ Temps : ___ms
- 📝 Notes :

---

### Tests V1 - Cube: Adventure Works DW2022

#### Test 6 : Total sales

**Input:**
```
Schema:
Cube: [Adventure Works DW2022]
Measures: [Measures].[Sales Amount], [Measures].[Order Quantity]
Dimensions: [Product].[Product], [Geography].[Country]

Question: Total sales
```

**Réponse du modèle:**
```
[COPIER LA RÉPONSE ICI]
```

**Analyse:**
- ✅/❌ JSON valide ?
- ✅/❌ MDX correct ?
- ⏱️ Temps : ___ms
- 📝 Notes :

---

#### Test 7 : Sales by product

**Input:**
```
Question: Sales by product
```

**Réponse du modèle:**
```
[COPIER LA RÉPONSE ICI]
```

**Analyse:**
- ✅/❌ JSON valide ?
- ✅/❌ MDX correct ?
- ⏱️ Temps : ___ms
- 📝 Notes :

---

#### Test 8 : Top 10 countries

**Input:**
```
Question: Top 10 countries by quantity
```

**Réponse du modèle:**
```
[COPIER LA RÉPONSE ICI]
```

**Analyse:**
- ✅/❌ JSON valide ?
- ✅/❌ MDX correct ?
- ⏱️ Temps : ___ms
- 📝 Notes :

---

### Tests V1 - Cube: Sales_cubes

#### Test 9 : Total sales

**Input:**
```
Schema:
Cube: [Sales_cubes]
Measures: [Measures].[Total Sales], [Measures].[Units Sold]
Dimensions: [Date].[Year], [Customer].[Region]

Question: Total sales
```

**Réponse du modèle:**
```
[COPIER LA RÉPONSE ICI]
```

**Analyse:**
- ✅/❌ JSON valide ?
- ✅/❌ MDX correct ?
- ⏱️ Temps : ___ms
- 📝 Notes :

---

#### Test 10 : Sales by year

**Input:**
```
Question: Sales by year
```

**Réponse du modèle:**
```
[COPIER LA RÉPONSE ICI]
```

**Analyse:**
- ✅/❌ JSON valide ?
- ✅/❌ MDX correct ?
- ⏱️ Temps : ___ms
- 📝 Notes :

---

### 📊 Résumé Version 1

**Total tests :** 10

**Résultats :**
- JSON valide : ___/10
- MDX correct : ___/10
- Temps moyen : ___ms

**Problèmes identifiés :**
1. [ ] ...
2. [ ] ...
3. [ ] ...

**Décision :**
- [ ] ✅ Prompt V1 OK → Passer à l'intégration
- [ ] 🔧 Besoin Version 2 → Voir ci-dessous

---

## 🔧 Version 2 - Améliorations

**Date :** [À REMPLIR APRÈS TESTS V1]

**Problèmes V1 :**
1. [À REMPLIR]
2. [À REMPLIR]

**Corrections V2 :**
- [À REMPLIR]

### Prompt V2
```
[COPIER LE PROMPT AMÉLIORÉ ICI]
```

---

### Tests V2

[MÊME FORMAT QUE V1]

---

## ✅ PROMPT FINAL VALIDÉ

**Date de validation :** [APRÈS TOUS LES TESTS]

**Validé par :** [VOTRE NOM]

**Tests réussis :** ___/10

**Performance moyenne :** ___ms

### 🎯 Prompt final à intégrer dans le code
```
[COPIER LE PROMPT FINAL VALIDÉ ICI]
```

---

## 📈 Tableau comparatif des versions

| Métrique | V1 | V2 | V3 | Final |
|----------|----|----|----|----|
| JSON valide | __/10 | __/10 | __/10 | __/10 |
| MDX correct | __/10 | __/10 | __/10 | __/10 |
| Temps moyen | __ms | __ms | __ms | __ms |
| cubecom | __/5 | __/5 | __/5 | __/5 |
| Adventure Works | __/3 | __/3 | __/3 | __/3 |
| Sales_cubes | __/2 | __/2 | __/2 | __/2 |

---

## 💡 Leçons apprises

**Ce qui marche bien :**
- [À REMPLIR]

**Ce qui ne marche pas :**
- [À REMPLIR]

**Astuces pour le prompt :**
- [À REMPLIR]

---

## 🚀 Prochaines étapes

- [ ] Intégrer le prompt final dans `ai.service.ts`
- [ ] Tester dans le chatbot
- [ ] Ajouter des exemples spécifiques si besoin
- [ ] Documenter les cas limites

---

**FIN DU JOURNAL**