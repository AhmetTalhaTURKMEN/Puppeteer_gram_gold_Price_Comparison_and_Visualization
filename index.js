
const puppeteer = require("puppeteer");

const fs = require("fs");

const path = require('path');

const XLSX = require("xlsx");

const scrape = async () => {
  const yapikrediurl = `https://www.yapikredi.com.tr/yatirimci-kosesi/altin-bilgileri`;
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(yapikrediurl);

  const [yapikredialiselement] = await page.$x('//*[@id="credit-table"]/tbody/tr[1]/td[2]');
  // $x puppeteer'in bir methodu ve xpath ifadesine yönlendirilir

  const yapikredialis = await yapikredialiselement.getProperty("textContent");
  let yapikredialisvalue = await yapikredialis.jsonValue();
  yapikredialisvalue = parseFloat(yapikredialisvalue.trim().split('.').join("").split(',').join("."));


  const [yapikredisatiselement] = await page.$x('//*[@id="credit-table"]/tbody/tr[1]/td[3]');

  const yapikredisatis = await yapikredisatiselement.getProperty("textContent");
  let yapikredisatisvalue = await yapikredisatis.jsonValue();
  yapikredisatisvalue = parseFloat(yapikredisatisvalue.trim().split('.').join("").split(',').join("."));

  console.log("yapikredi alis : " + yapikredialisvalue + "\n");
  console.log("yapikredi satis : " + yapikredisatisvalue + "\n");

  browser.close();

  const ziraaturl = `https://www.ziraatbank.com.tr/tr/fiyatlar-ve-oranlar`;
  const ziraatbrowser = await puppeteer.launch();
  const ziraatpage = await ziraatbrowser.newPage();
  await ziraatpage.goto(ziraaturl);

  const [ziraataliselement] = await ziraatpage.$x('//*[@id="result-altinfiyat"]/div[2]/div/table/tbody/tr[2]/td[3]');

  const ziraatalis = await ziraataliselement.getProperty("textContent");
  let ziraatalisvalue = await ziraatalis.jsonValue();
  ziraatalisvalue = parseFloat(ziraatalisvalue.trim().split(',').join("."));

  const [ziraatsatiselement] = await ziraatpage.$x('//*[@id="result-altinfiyat"]/div[2]/div/table/tbody/tr[2]/td[4]');

  const ziraatsatis = await ziraatsatiselement.getProperty("textContent");
  let ziraatsatisvalue = await ziraatsatis.jsonValue();
  ziraatsatisvalue = parseFloat(ziraatsatisvalue.trim().split(',').join("."));

  console.log("ziraat alis : " + ziraatalisvalue + "\n");
  console.log("ziraat satis : " + ziraatsatisvalue + "\n");

  ziraatbrowser.close();

  console.log("yapikredi alista su kadar karlidir: " + (yapikredialisvalue - ziraatalisvalue));
  console.log("yapikredi satista su kadar karlidir: " + (ziraatsatisvalue - yapikredisatisvalue));

  let today = new Date();
  let date = today.toLocaleDateString();
  let time = today.toLocaleTimeString();
  const data = [{
    Tarih: date,
    zaman: time,
    yapikredialis: yapikredialisvalue,
    yapikredisatis: yapikredisatisvalue,
    ziraatalis: ziraatalisvalue,
    ziraatsatis: ziraatsatisvalue
  }];

  await writeDataToExcel(data);

  addDataToJsonFile(data);

}

function addDataToJsonFile(newData) {

  const filePath = path.join(__dirname, 'data.json');

  if (fs.existsSync(filePath)) {
    // File exists, read and append new data
    fs.readFile(filePath, 'utf8', (err, jsonString) => {
      if (err) {
        console.log('File read failed:', err);
        return;
      }

      // Parse the data from file
      const data = JSON.parse(jsonString);

      // Add the new data to the data list
      data.push(newData);

      // Write the new data to the file
      fs.writeFile(filePath, JSON.stringify(data), err => {
        if (err) {
          console.log('Error writing file:', err);
        } else {
          console.log('Data added to file');
        }
      });
    });
  } else {
    // File does not exist, create new file and add data
    const data = [newData];
    fs.writeFile(filePath, JSON.stringify(data), err => {
      if (err) {
        console.log('Error writing file:', err);
      } else {
        console.log('File created and data added');
      }
    });
  }
}



const writeDataToExcel = async (data) => {
  const filePath = "altin_fiyatlari.xlsx";

  // Check if the file exists, if not create a new one
  let workbook;
  if (fs.existsSync(filePath)) {
    workbook = XLSX.readFile(filePath);
  } else {
    workbook = XLSX.utils.book_new();
  }

  const worksheetName = "Altin Fiyatlari";
  let worksheet = workbook.Sheets[worksheetName];

  // If the worksheet doesn't exist, create a new one
  if (!worksheet) {
    worksheet = XLSX.utils.json_to_sheet([]);
    workbook.SheetNames.push(worksheetName);
    workbook.Sheets[worksheetName] = worksheet;
  }

  // Add header to the worksheet
  const header = ["Tarih", "Zaman", "YapiKredi Alış", "YapiKredi Satış", "Ziraat Alış", "Ziraat Satış"];
  XLSX.utils.sheet_add_aoa(worksheet, [header], { origin: 0 });

  // Append the new data to the worksheet
  const rowIndex = worksheet["!ref"] ? XLSX.utils.decode_range(worksheet["!ref"]).e.r + 1 : 1;
  XLSX.utils.sheet_add_json(worksheet, data, { skipHeader: true, origin: rowIndex });

  // Write the updated workbook to the file
  XLSX.writeFile(workbook, filePath);
  console.log("Excel file written successfully.");
};

scrape();

setInterval(() => {
  scrape();
}, 60000);
