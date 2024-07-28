const data = require('./data')
const puppeteer = require('puppeteer')
const fs = require('fs');
const path = require('path');
const axios = require('axios');
// const url_segments = data[0].slice('/');
// console.log(url_segments[0]);
async function downloadImage(url, filepath) {
    const writer = fs.createWriteStream(filepath);
    const response = await axios({ url, responseType: 'stream' });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function Crawler(url, url_base = ""){
   const browser = await puppeteer.launch({headless : false});
   const page = await browser.newPage();
   await page.goto(url, {
    timeout : 60000,
    waitUntil : 'load'
   });
   const urls = await page.evaluate(()=>{
        const links = Array.from(document.querySelectorAll('a'));
        return links.map((element)=>element.href).filter(link => link.includes('pec'));
    }
    )
   fs.writeFileSync('./extracted_urls.js', `const data = ${JSON.stringify(urls)};`);
    const image_urls = await page.evaluate(()=> {
       const images =  document.querySelectorAll('img');
       const image_list = Array.from(images);
       return image_list.map((element)=>{
            return element.src;
       }) 
    }
    )
    const imageUrls = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map(img => img.src);
    });

    console.log('Extracted image URLs:', imageUrls);

    // Create a directory for images if it doesn't exist
    const imagesDir = './images';
    if (!fs.existsSync(imagesDir)){
        fs.mkdirSync(imagesDir);
    }

    // Download each image
    for (const [index, imageUrl] of imageUrls.entries()) {
        const fileName = `image${index + 1}${path.extname(new URL(imageUrl).pathname)}`;
        const filePath = path.join(imagesDir, fileName);
        try {
            await downloadImage(imageUrl, filePath);
            console.log(`Saved ${imageUrl} to ${filePath}`);
        } catch (error) {
            console.error(`Failed to download ${imageUrl}:`, error);
        }
    }
   await page.screenshot({path : "screenshot.png", fullPage: true});
   browser.close();
}

Crawler(data[0]);
