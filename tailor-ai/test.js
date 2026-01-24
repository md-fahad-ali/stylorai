const fs = require('fs');
const axios = require('axios');
const zlib = require('zlib');
const csv = require('csv-parser');

// Coast-এর মার্চেন্ট আইডি (এটি ফিক্সড থাকবে)
const COAST_ID = '57411';

// কমান্ড লাইন থেকে সার্চের শব্দ নেওয়া হচ্ছে
// ব্যবহার: node search.js "black party dress"
const userQuery = process.argv[2];

// যদি ইউজার কিছু না লেখে, তবে ডিফল্ট হিসেবে 'party dress' খুঁজবে
const SEARCH_KEYWORD = userQuery ? userQuery : 'party dress';

console.log(`\n🔍 খুঁজছি: "${SEARCH_KEYWORD}"...`);

async function searchInCoastData() {
    const results = [];
    let foundUrl = null;

    // ১. datafeeds.csv ফাইল থেকে Coast-এর URL খোঁজা
    fs.createReadStream('datafeeds.csv')
        .pipe(csv())
        .on('data', (data) => {
            if (data['Advertiser ID'] === COAST_ID) {
                foundUrl = data.URL;
            }
        })
        .on('end', async () => {
            if (!foundUrl) {
                console.log("❌ ত্রুটি: Coast (57411) আপনার ডাটাফিড ফাইলে পাওয়া যায়নি।");
                return;
            }

            console.log(`✅ Coast-এর লিংক পাওয়া গেছে। ডাটা নামানো হচ্ছে...`);

            try {
                // ২. লাইভ ডাটা ডাউনলোড করা
                const response = await axios({
                    method: 'get',
                    url: foundUrl,
                    responseType: 'stream'
                });

                let matchCount = 0;
                // সার্চের শব্দগুলোকে ছোট হাতের অক্ষরে ভেঙ্গে আলাদা করা হচ্ছে
                const searchTerms = SEARCH_KEYWORD.toLowerCase().split(' ').filter(t => t.trim() !== '');

                // ৩. ডাটা প্রসেসিং এবং ফিল্টারিং
                const stream = response.data.pipe(zlib.createGunzip()).pipe(csv());

                stream.on('data', (product) => {
                    const name = product.product_name ? product.product_name.toLowerCase() : '';
                    const desc = product.description ? product.description.toLowerCase() : '';

                    // লজিক: সার্চের প্রতিটি শব্দ নাম বা বর্ণনার মধ্যে থাকতে হবে
                    const isMatch = searchTerms.every(term => name.includes(term) || desc.includes(term));

                    if (isMatch) {
                        matchCount++;

                        // টার্মিনাল পরিষ্কার রাখতে প্রথম ৫টি রেজাল্ট দেখানো হবে
                        if (matchCount <= 5) {
                            console.log('-----------------------------------');
                            console.log(`👗 পণ্য: ${product.product_name}`);
                            console.log(`💰 দাম: £${product.search_price}`);
                            console.log(`🔗 লিংক: ${product.aw_deep_link}`);
                        }
                    }
                });

                stream.on('end', () => {
                    console.log('-----------------------------------');
                    if (matchCount === 0) {
                        console.log('❌ দুঃখিত, এই নামে কোনো ড্রেস পাওয়া যায়নি।');
                    } else {
                        console.log(`\n🎉 সার্চ সম্পন্ন! মোট ${matchCount} টি পণ্য পাওয়া গেছে।`);
                        if (matchCount > 5) {
                            console.log(`(আরও ${matchCount - 5} টি পণ্য আছে যা এখানে দেখানো হয়নি)`);
                        }
                    }
                });

                stream.on('error', (err) => {
                    console.error('CSV পড়তে সমস্যা হয়েছে:', err.message);
                });

            } catch (err) {
                console.error("URL থেকে ডাটা আনতে সমস্যা হয়েছে:", err.message);
            }
        });
}

// ফাংশন কল করা
searchInCoastData();