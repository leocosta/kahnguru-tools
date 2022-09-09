
const puppeteer = require('puppeteer');
const { moveFile, fileExists } = require('./helpers');

(async () => {
    const options = {
        targetUrl: 'https://www3.bcb.gov.br/ifdata/',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36',
        dataPath: './data',
        destinationCsv: 'fi-report-{0}.csv',
        sourceCsv: 'dados.csv',
        enablePageLog: false
    }

    console.log(`Extracting data from ${options.targetUrl}`);

    const browser = await puppeteer.launch({
        headless: true, 
        devtools: false,
    });
    
    var page = await browser.newPage();
    page.on('console', msg => options.enablePageLog && console.log(`PAGE LOG: ${ msg.text() }`));

    const client = await page.target().createCDPSession()
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: options.dataPath,
    })  

    await page.setUserAgent(options.userAgent);
    await page.goto(options.targetUrl, {
        waitUntil: ['domcontentloaded', 'networkidle0']
    });

    // getting baseline dates
    const dates = await page.evaluate(options => {
        const childNodes = [ ...document.getElementById('ulDataBase').childNodes ];
        return childNodes.map((item, index) => ({
            value: item.innerText,
            filename: `${options.dataPath}/${ options.destinationCsv.replace('{0}', item.innerText.replace('/','-')) }`,
            index: index
        }))
    }, options);

    dates.forEach(async baseline => {
        if (fileExists(baseline.filename)) {
            console.log(`Skiping quarter ${ baseline.value }: ${baseline.filename} already exists.`)
        }
        else {
            await extractData(page, baseline, options);
        }
    })
    
    await browser.close();

    console.log(`Extraction has been completed!`)
})();


async function extractData(page, baseline, options) {

    // applying page filters
    await page.evaluate(async (baseline) => {
        const DEFAULT_INSTITUTION_TYPE = 1; //Conglomerados Prudenciais e Instituições Independentes
        const DEFAULT_REPORT_TYPE = 14; //Informações de Capital

        selectDataBase(baseline.index);
        selectTipoInst(DEFAULT_INSTITUTION_TYPE);
        selectRelatorio(DEFAULT_REPORT_TYPE);
    }, baseline);

    // waiting for the export button display
    await page.waitForSelector('#aExportCsv', { visible: true, timeout: 120 * 1000 });

    // downloading csv
    await page.evaluate((baseline) => {
        console.log(`Downloading file ${baseline.filename}`);

        downloadCsv();
    }, baseline);

    // renaming file dados.csv to baseline date filename
    console.log(`Saving report of ${ baseline.value } quarter in ${ baseline.filename }.`);

    moveFile(`${ options.dataPath }/${ options.sourceCsv }`, baseline.filename);
}