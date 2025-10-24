# 🍏 OWASP Juice Shop - End-to-End Data Scraping (Playwright, XLSX, JS)

## 🌟 Prehľad projektu
Tento projekt predstavuje robustný End-to-End (E2E) testovací a scrapingový framework postavený na Playwrighte, Node.js a knižnici XLSX. Cieľom je automaticky navštíviť platformu OWASP Juice Shop (simulácia e-shopu), vyhľadať produkty podľa dát z externého Excel súboru a extrahovať kľúčové informácie (názov, cena, dostupnosť).

**Kľúčová vlastnosť:** Výsledky sú profesionálne uložené do formátovaného Excel súboru (.xlsx) s časovou pečiatkou (`DatumExtrakcie`) pre auditovanie dát, a to v oddelenom výstupnom priečinku `results/`.

## ⚙️ Technológie a Architektúra
* **Testovací framework:** Playwright (Node.js)
* **Dátový zdroj:** Microsoft Excel (.xlsx) pre vstupné dáta.
* **Reporting/Output:** XLSX knižnica pre generovanie formátovaného Excelu.
* **Jazyk:** JavaScript (JS)



## 📁 Štruktúra Priečinkov (Best Practice)
/my-playwright-project ├── data/ │ 
                             └── owasp_juice_shop_scraping.xlsx <-- VSTUPNÉ DÁTA pre testy
					   ├── results/ │ 
					         └── scraped_results_final.xlsx <-- VÝSTUPNÉ ARTEFAKTY (Profesionálny report) 
					   ├── tests/ │ 
					         ├── juice.test.js │
							 ├── juice_data_extraction.test.js │ 
							 └── juice_data_extraction_v3.test.js <-- AKTUÁLNA A FINÁLNA VERZIA 
					   ├── node_modules/ 
					   ├── playwright.config.js 
					   └── package.json
					   

## 🚀 Spustenie projektu (Kľúčová časť pre GitHub)
1.  **Klonovanie repozitára:**
    ```bash
    git clone [VÁŠ-REPOZITÁR-URL]
    cd [NAZOV-PROJEKTU]
    ```
2.  **Inštalácia závislostí:**
    ```bash
    npm install
    ```
3.  **Spustenie finálnej verzie testov:**
    ```bash
    npx playwright test ./tests/juice_data_extraction_v3.test.js
    ```
    *(Uistite sa, že aplikácia OWASP Juice Shop beží na `localhost:3000`.)*

## 💡 História a Evolúcia Testov (Refactoring)
Tieto súbory v priečinku `tests/` demonštrujú vývoj a postupné zlepšovanie testovacieho frameworku:	
	
Kľúčové Funkcie |
| :--- | :---: | :--- |
| **`juice.test.js`** | **V1** | **Základná funkčnosť (Smoke Test).
** Pravdepodobne prvé verzie testu, ktoré overovali jednoduchú navigáciu a vyhľadávanie s hardcoded hodnotami (bez dátového riadenia z Excelu).


|
| **`juice_data_extraction.test.js`** | **V2** | **Dátové riadenie (Data-Driven).
** Bola pridaná implementácia čítania hľadaných výrazov z externého Excel súboru. 
Testovacia logika sa spúšťa v cykle (`forEach`) pre každý riadok dát.

 
|
| **`juice_data_extraction_v3.test.js`** | **V3 (Aktuálna)** | 
**Profesionálny Reporting & Čistota dát.** Ide o finálnu verziu so zameraním na výstup a architektúru. 
**Vylepšenia:** Ukladanie do oddeleného `results/` priečinka,
 pridanie časovej pečiatky (`DatumExtrakcie`),
 automatické formátovanie Excelu pre čitateľnosť a odstránenie redundantného stĺpca `HladanyVyraz`. |	