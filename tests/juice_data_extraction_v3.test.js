// tests/juice_data_extraction_v3.test.js - KÓD PRE EXTRAKCIU DÁT (FINÁLNA, STABILNÁ VERZIA)
const { test } = require('@playwright/test');
const { expect } = require('@playwright/test'); 
const XLSX = require('xlsx');
const path = require('path');

// ===============================================
// KONŠTANTY A FUNKCIE EXCELU
// ===============================================
const DATA_FILE = 'owasp_juice_shop_scraping.xlsx';
const SHEET_NAME = 'Tovar'; 
const OUTPUT_FILE = 'scraped_results_final.xlsx'; // Názov súboru pre finálne výsledky
const OUTPUT_DIR = 'results'; // Výstupný priečinok pre profesionálne štandardy

// Načítanie dát z Excelu (Vstupné dáta z priečinka 'data')
function loadDataFromXLSX(filename, sheetName) {
    const projectRoot = path.resolve(__dirname, '..');
    const filePath = path.join(projectRoot, 'data', filename); 
    let workbook;

    try {
        workbook = XLSX.readFile(filePath);
    } catch (error) {
        console.error(`KRITICKÁ CHYBA: Nepodarilo sa prečítať Excel súbor "${filePath}". Uistite sa, že je v priečinku 'data'.`);
        return [];
    }
    
    if (!workbook.Sheets[sheetName]) {
        console.error(`KRITICKÁ CHYBA: Hárok s názvom "${sheetName}" nebol nájdený v súbore.`);
        return [];
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = rawData[0];
    const testData = rawData.slice(1).map(row => {
        const item = {};
        headers.forEach((header, index) => {
            if (header && row[index] !== undefined) {
                item[header.trim()] = String(row[index]).trim();
            }
        });
        return item;
    }).filter(item => item['Hladat']);

    return testData;
}

// Funkcia pre export dát do Excelu (S NOVÝM PORADÍM STĹPCOV a VYLEPŠENÝM FORMÁTOVANÍM)
function exportDataToXLSX(data, filename) {
    const projectRoot = path.resolve(__dirname, '..');
    const filePath = path.join(projectRoot, OUTPUT_DIR, filename); 
    
    const ws = XLSX.utils.json_to_sheet(data);

    // --- PROFESIONÁLNE FORMÁTOVANIE PRE LEPŠIU ČITATEĽNOSŤ ---

    // 1. Nastavenie Šírky Stĺpcov: ODPOVEDÁ NOVÉMU PORADIU
    const columnWidths = [
        { wch: 10 }, // TestCaseID (A)
        { wch: 40 }, // NazovProduktu (B)
        { wch: 10 }, // Cena (C)
        { wch: 15 }, // Dostupnost (D)
        { wch: 22 }  // DatumExtrakcie (E)
    ];
    ws['!cols'] = columnWidths;

    // 2. Nastavenie Zalomenia Textu (Wrap Text) pre Hlavičky
    if (data.length > 0) {
        const headerKeys = Object.keys(data[0]);
        headerKeys.forEach((key, index) => {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index }); 
            
            if (ws[cellAddress]) {
                 // Pridáme štýl, ktorý zabezpečí zalomenie textu, tučné písmo a zarovnanie na stred
                 ws[cellAddress].s = {
                     alignment: { 
                         wrapText: true, 
                         vertical: 'center' 
                     },
                     font: { bold: true } 
                 };
            }
        });
    }

    // -----------------------------------------------------------------

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scraping_Vysledky");
    
    XLSX.writeFile(wb, filePath);
    console.log(`\nEXPORT: Scraping výsledky uložené do súboru: ${filePath}`);
}

const testCases = loadDataFromXLSX(DATA_FILE, SHEET_NAME);
if (testCases.length === 0) {
    console.error("\nKRITICKÁ CHYBA: Nenašli sa žiadne testovacie prípady na spustenie!");
    test.skip(() => {
        test('Dummy test', async () => {});
    });
}

const globalScrapedData = []; // Pole pre globálne výsledky

/**
 * DÁTOVÝ TEST: Prehľadá vyhľadávanie a extrahuje detaily
 */
testCases.forEach(testCase => {
    
    const testName = `DATA ${testCase.TestCaseID}: Extrakcia dát (Scraping) pre "${testCase.Hladat}"`;

    test(testName, async ({ page }) => {
        const Hladat = testCase.Hladat;
        
        // ZÍSKANIE DÁTUMU A ČASU EXTRAKCIE
        const DatumExtrakcie = new Date().toISOString(); 

        // 1. NAVIGÁCIA (Používame priamy prechod cez query parameter)
        await page.goto(`/search?q=${encodeURIComponent(Hladat)}`);

        // 2. Riešenie Pop-upov (Cookies a Welcome banner)
        try {
            await page.locator('button.cc-btn').first().click({ timeout: 5000 }); 
        } catch (e) { /* ignore */ }
        try {
            await page.locator('button[aria-label="Close Welcome Banner"]').first().click({ timeout: 5000 });
        } catch (e) { /* ignore */ }

        // 3. Čakanie na výsledky (zmiznutie loading spinnera)
        await page.locator('.mat-spinner').waitFor({ state: 'hidden', timeout: 15000 });

        // Extrémne čakanie na vykreslenie DÁT (Prvý produkt) - 60 sekúnd
        await page.waitForSelector('.mat-grid-tile .item-name', { state: 'visible', timeout: 60000 }); 

        // 4. Overenie a ZBER DÁT
        const allProductLocators = await page.locator('.mat-grid-tile').all(); 
        
        const count = allProductLocators.length;
        expect(count, `CHYBA OVERENIA: Vyhľadávanie pre "${Hladat}" nevrátilo žiadne produkty.`).toBeGreaterThan(0);

        const scrapedData = [];
        
        for (const locator of allProductLocators) {
            
            // Extrakcia Názvu
            const title = await locator.locator('.item-name').textContent({ timeout: 0 }); 
            
            // Extrakcia Ceny - OPRAVENÝ SELEKTOR
            const priceText = await locator.locator('span.ng-star-inserted').textContent({ timeout: 0 });
            
            // Dostupnosť (Hľadáme text "Sold Out")
            let dostupnost;
            const soldOutLocator = locator.locator('mat-card-subtitle', { hasText: 'Sold Out' });
            
            if (await soldOutLocator.isVisible({ timeout: 200 })) {
                dostupnost = "Vypredané";
            } else {
                dostupnost = "Dostupné";
            }
            
            // Uloženie nájdených dát - NOVÉ PORADIE STĹPCOV (HladanyVyraz VYNECHANÝ)
            scrapedData.push({
                TestCaseID: testCase.TestCaseID,
                NazovProduktu: title.trim(),
                Cena: priceText.trim(),
                Dostupnost: dostupnost,
                DatumExtrakcie: DatumExtrakcie // Posunutý na koniec
            });
        }
        
        // Pridanie dát z aktuálneho testu do globálneho poľa
        globalScrapedData.push(...scrapedData);
        
        // VÝSTUP SCRAPOVANÝCH DÁT DO KONZOLY
        console.log(`\n==============================================`);
        console.log(`DATA ${testCase.TestCaseID} ÚSPEŠNE EXTRAHOVANÉ`);
        console.log(`Nájdené ${scrapedData.length} produktov pre "${Hladat}".`);
        
        scrapedData.forEach(item => {
            console.log(`  - Názov: ${item.NazovProduktu} | Cena: ${item.Cena} | Dátum: ${item.DatumExtrakcie.substring(0, 19)}`);
        });
        console.log(`==============================================`);
    });
});

// PO VŠETKÝCH TESTOCH: Uloženie globálneho poľa do Excelu v priečinku 'results'
test.afterAll(async () => {
    if (globalScrapedData.length > 0) {
        exportDataToXLSX(globalScrapedData, OUTPUT_FILE);
    } else {
        console.log("\nUPOZORNENIE: Žiadne dáta neboli úspešne scrapované, Excel súbor nebol vytvorený.");
    }
});