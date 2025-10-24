const { test } = require('@playwright/test');
const { expect } = require('@playwright/test'); 
const XLSX = require('xlsx');
const path = require('path');

// ===============================================
// KONŠTANTY A FUNKCIE EXCELU
// ===============================================
const DATA_FILE = 'owasp_juice_shop_scraping.xlsx';
const SHEET_NAME = 'Tovar'; 

function loadDataFromXLSX(filename, sheetName) {
    const projectRoot = path.resolve(__dirname, '..');
    const filePath = path.join(projectRoot, 'data', filename); 
    let workbook;

    try {
        workbook = XLSX.readFile(filePath);
    } catch (error) {
        console.error(`KRITICKÁ CHYBA: Nepodarilo sa prečítať Excel súbor "${filePath}".`);
        return [];
    }
    
    if (!workbook.Sheets[sheetName]) {
        console.error(`KRITICKÁ CHYBA: Hárok "${sheetName}" nebol nájdený.`);
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

// Načítanie testovacích dát
const testCases = loadDataFromXLSX(DATA_FILE, SHEET_NAME);
if (testCases.length === 0) {
    console.error("KRITICKÁ CHYBA: Nenašli sa žiadne testovacie prípady!");
    test.skip(() => {
        test('Dummy test', async () => {});
    });
}

// ===============================================
// TEST BLOK
// ===============================================
testCases.forEach(testCase => {
    
    const testName = `TC ${testCase.TestCaseID}: Extrakcia dát pre "${testCase.Hladat}"`;

    test(testName, async ({ page }) => {
        const Hladat = testCase.Hladat;

        // 1. Priamy prechod na výsledky vyhľadávania (plná URL)
        await page.goto(`http://localhost:3000/#/search?q=${encodeURIComponent(Hladat)}`);

        // 2. Riešenie pop-upov
        try { await page.locator('button.cc-btn').first().click({ timeout: 3000 }); } catch (e) {}
        try { await page.locator('button[aria-label="Close Welcome Banner"]').first().click({ timeout: 3000 }); } catch (e) {}

        // 3. Čakanie na produkty
        const productCards = page.locator('.mat-grid-tile-content');
        await productCards.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
            console.warn(`Varovanie: Produkty pre "${Hladat}" sa nezobrazili do 5s`);
        });

        const count = await productCards.count();
        console.log(`TC ${testCase.TestCaseID}: Počet produktov nájdených: ${count}`);
        if (count === 0) return;

        // 4. Extrakcia názvov a cien
        for (let i = 0; i < count; i++) {
            const card = productCards.nth(i);

            // Názov
            const titleLocator = card.locator('.item-name');
            await titleLocator.waitFor({ state: 'visible', timeout: 5000 });
            const title = await titleLocator.textContent();

            // Cena
            const priceLocator = card.locator('span.ng-star-inserted');
            await priceLocator.waitFor({ state: 'visible', timeout: 5000 });
            const rawPrice = await priceLocator.textContent();
            const price = rawPrice.replace('¤', '').trim();

            console.log(`TC ${testCase.TestCaseID}: Produkt: "${title.trim()}", Cena: "${price}"`);
        }

        console.log(`\n==============================================`);
        console.log(`TC ${testCase.TestCaseID} ÚSPEŠNE EXTRAHOVANÝ`);
        console.log(`==============================================\n`);
    });
});
