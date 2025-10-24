// tests/juice.test.js - FINÁLNA VERZIA
const { test } = require('@playwright/test');
const { expect } = require('@playwright/test'); 
const XLSX = require('xlsx');
const path = require('path');

// ===============================================
// KONŠTANTY A FUNKCIE EXCELU
// ===============================================
const DATA_FILE = 'owasp_juice_shop_scraping.xlsx';
const SHEET_NAME = 'Tovar'; 

// Načítanie dát z Excelu (Kľúčová funkcia)
function loadDataFromXLSX(filename, sheetName) {
    // Hľadáme 'data' v priečinku 'Auto-Test-Owasp' (o úroveň vyššie ako tests)
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

// Načítanie testovacích dát raz
const testCases = loadDataFromXLSX(DATA_FILE, SHEET_NAME);
if (testCases.length === 0) {
    console.error("\nKRITICKÁ CHYBA: Nenašli sa žiadne testovacie prípady na spustenie!");
    test.skip(() => {
        test('Dummy test', async () => {});
    });
}


/**
 * Testovací blok - pre každý riadok v Exceli sa spustí jeden Playwright test.
 */
testCases.forEach(testCase => {
    
    const testName = `TC ${testCase.TestCaseID}: Vyhľadávanie pre "${testCase.Hladat}"`;

    test(testName, async ({ page }) => {
        const Hladat = testCase.Hladat;
        
        // 1. OPTIMALIZOVANÁ NAVIGÁCIA: Priamy prechod na stránku s výsledkami vyhľadávania
        await page.goto(`/search?q=${encodeURIComponent(Hladat)}`);

        // 2. Riešenie Pop-upov (Cookies a Welcome banner)
        try {
            await page.locator('button.cc-btn').first().click({ timeout: 5000 }); 
        } catch (e) { /* ignore */ }
        try {
            await page.locator('button[aria-label="Close Welcome Banner"]').first().click({ timeout: 5000 });
        } catch (e) { /* ignore */ }

        // Čakanie na stabilizáciu
        await page.waitForTimeout(1000); 

        // 3. Čakanie na výsledky (zmiznutie loading spinnera)
        await page.locator('.mat-spinner').waitFor({ state: 'hidden', timeout: 15000 });

        // 4. Overenie
        const productCards = page.locator('.mat-grid-tile-content');
        
        // DÔLEŽITÁ OPRAVA: Nahradenie nefunkčného toHaveCountGreaterThan()
        const count = await productCards.count();
        expect(count, `CHYBA OVERENIA: Vyhľadávanie pre "${Hladat}" nevrátilo žiadne produkty.`).toBeGreaterThan(0);

        // Overenie B: Dátová Integrita (Každý názov musí obsahovať hľadaný výraz)
        const allTitles = await productCards.locator('h1').allTextContents();
        
        allTitles.forEach(title => {
             expect(title.toLowerCase()).toContain(Hladat.toLowerCase(), `CHYBA INTEGRIY: Produkt "${title}" neobsahuje hľadaný výraz "${Hladat}".`);
             console.log(`POTVRDENIE TC ${testCase.TestCaseID}: Produkt "${title}" bol nájdený.`);
        });
        
        console.log(`\n==============================================`);
        console.log(`TC ${testCase.TestCaseID} ÚSPEŠNE OVERENÝ`);
        console.log(`==============================================`);
    });
});