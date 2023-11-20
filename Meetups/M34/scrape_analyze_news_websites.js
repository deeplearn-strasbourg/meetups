// to run: node 1_scrape.js country >> out.txt 2>&1

const countryArg = process.argv.slice(2);
const fs = require('fs').promises;
const axios = require('axios');
const path = require('path');
const { URL } = require('url');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const {encode, decode} = require('gpt-3-encoder');
const OPENAI_API_KEY = 'sk-write_your key here';
const MAX_RETRIES = 2;
const priceGPT3 = {"4k":{"input":0.0015, "output": 0.002 },"8k":{"input":0.003, "output": 0.004}};
const priceGPT4 = {"8k":{"input":0.03 , "output": 0.06  },"32k":{"input":0.06, "output": 0.12}};
const OPENAI_ENDPOINT = `https://api.openai.com/v1/chat/completions`;

//const MODEL = 'gpt-3.5-turbo';
const MODEL = 'gpt-4';

let MAX_TOKENS;
if (MODEL === 'gpt-4') {
    MAX_TOKENS = 7000;
}
else if (MODEL === 'gpt-3.5-turbo') {
    MAX_TOKENS = 3000;
}
else {
    throw new Error(`Unsupported MODEL: ${MODEL}`);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const prompt = `
You are a helpful assistant. You are expert in Bulgarian to French translations. 
You will receive some titles extracted from a Bulgarian news website. 
Titles are separated by the "||" character. 
Your main task is to select only titles related to environment 
and to translate them in French.

**Guidelines**:
1. **Omissions**:
   - Eliminate titles not related to environment.

2. **Output Format**:
   - Return them in a list with the format: [['title 1'], ['title 2'], ... ['title N']]. 
   - If no titles fit the criteria, return an empty list [].

3. **Translation**:
   - Ensure the returned titles are translated to French.

The news titles to analyze are: 
`;

// Example titles will follow this prompt.

const newsLinks = {
    "France": ['https://www.lemonde.fr/', 'https://www.lepoint.fr/', 'https://www.lefigaro.fr/',
               'https://www.liberation.fr/', 'https://www.lexpress.fr/', 'https://www.france24.com/fr/',
               'https://www.bfmtv.com/', 'https://www.ouest-france.fr/'],

    "UK": ['https://www.bbc.com/', 'https://www.dailymail.co.uk/home/index.html',
           'https://www.theguardian.com/europe', 'https://www.telegraph.co.uk/',
           'https://www.independent.co.uk/', 'https://www.mirror.co.uk/', 'https://news.sky.com/uk'],

    "Spain": ['https://elpais.com/', 'https://www.elmundo.es/', 'https://www.elespanol.com/',
              'https://www.abc.es/', 'https://www.elconfidencial.com/', 'https://www.20minutos.es/',
              'https://www.lavanguardia.com/'],

    "Belgium": ['https://www.hln.be/', 'https://www.nieuwsblad.be/', 'https://www.sudinfo.be/',
                'https://www.rtbf.be/', 'https://www.vrt.be/vrtnws/nl/', 'https://www.lecho.be/',
                'https://www.standaard.be/', 'https://www.lesoir.be/', 'https://www.lalibre.be/'],

    "Netherlands": ['https://www.telegraaf.nl/', 'https://www.nrc.nl/', 'https://www.ad.nl/',
                    'https://www.volkskrant.nl/', 'https://www.nu.nl/', 'https://www.rtlnieuws.nl/'],

    "Germany": ['https://www.spiegel.de/', 'https://www.zeit.de/index', 'https://www.sueddeutsche.de/',
                'https://www.faz.net/aktuell/', 'https://www.welt.de/', 'https://www.bild.de/',
                'https://www.focus.de/', 'https://www.t-online.de/', 'https://www.tagesschau.de/'],

    "Switzerland": ['https://www.nzz.ch/', 'https://www.tagesanzeiger.ch/', 'https://www.blick.ch/',
                    'https://www.20min.ch/', 'https://www.letemps.ch/', 'https://www.suedostschweiz.ch/',
                    'https://www.watson.ch/', 'https://www.srf.ch/news'],

    "Italy": ['https://www.corriere.it/', 'https://www.repubblica.it/', 'https://www.lastampa.it/',
              'https://www.ilsole24ore.com/', 'https://www.ansa.it/', 'https://www.ilmessaggero.it/',
              'https://www.ilfattoquotidiano.it/'],

    "Romania": ['https://www.hotnews.ro/', 'https://www.digi24.ro/', 'https://www.mediafax.ro/',
                'https://adevarul.ro/', 'https://ziare.com/', 'https://www.gandul.ro/',
                'https://www.libertatea.ro/', 'https://stirileprotv.ro/'],


    "Hungary": ['https://index.hu/', 'https://24.hu/', 'https://www.origo.hu/index.html',
                'https://hvg.hu/', 'https://168.hu/', 'https://www.portfolio.hu/', 'https://444.hu/'],

    "Poland": ['https://wyborcza.pl/0,0.html', 'https://www.onet.pl/', 'https://www.wp.pl/',
               'https://www.interia.pl/', 'https://tvn24.pl/', 'https://www.polityka.pl/',
               'https://www.gazeta.pl/0,0.html'],

    "Czech_Republic": ['https://www.idnes.cz/', 'https://www.novinky.cz/', 'https://www.irozhlas.cz/',
                       'https://www.lidovky.cz/', 'https://www.aktualne.cz/', 'https://www.seznamzpravy.cz/',
                       'https://www.ceskatelevize.cz/'],

    "Serbia": ['https://www.blic.rs/', 'https://www.kurir.rs/', 'https://www.rts.rs/sr/index.html',
               'https://www.politika.rs/', 'https://n1info.rs/', 'https://www.danas.rs/',
               'https://www.novosti.rs/', 'https://insajder.net/'],

    "Kosovo": ['https://telegrafi.com/', 'https://www.koha.net/', 'https://www.gazetaexpress.com/',
               'https://kosovapress.com/', 'https://www.rtklive.com/en/', 'https://insajderi.com/'],

    "Albania": ['https://www.albaniandailynews.com/', 'http://www.panorama.com.al/', 'https://www.oranews.tv/',
                'https://lapsi.al/', 'https://top-channel.tv/', 'https://exit.al/'],

    "Bulgaria": ['https://clubz.bg/', 'https://www.novinite.com/', 'https://www.mediapool.bg/', 'https://offnews.bg/']
};

async function createDirectory(country) {
    try {
        await fs.mkdir(path.join(__dirname, country), { recursive: true });
        console.log(`Directory for ${country} created.`);
    } catch (error) {
        console.error(`Error creating directory for ${country}:`, error);
    }
}

function preprocessText(inputText) {
    let processedText = inputText;
    processedText = processedText.replace(/(\d)([a-zA-Z])/g, '$1 $2');
    processedText = processedText.replace(/([a-zA-Z])(\d)/g, '$1 $2');
    processedText = processedText.replace(/([a-z])([A-Z])/g, '$1 $2');
    processedText = processedText.replace(/[•]/g, '-');
    processedText = processedText.replace(/●/g, ' ');
    return processedText;
}

async function getTitles(url) {
    const raw_titles = [];
    try {
        const response = await fetch(url);

        // Check if the request was successful
        if (!response.ok) {
            console.error("Failed to fetch the page");
            return;
        }

        const text = await response.text();
        const dom = new JSDOM(text);

        // Get titles
        const titles = dom.window.document.querySelectorAll('h1, h2, h3');
        
        // Log the titles
        titles.forEach((title, index) => {
            const cleanTitle = title.textContent.trim();
            const wordCount = cleanTitle.split(/\s+/).length;
            if(wordCount > 1) {
                const filteredTitle = preprocessText(cleanTitle);
                //console.log(`${index + 1}. ${title.textContent}`);
                raw_titles.push(filteredTitle);
            }
            
            
        });
        
        return raw_titles;

    } catch (error) {
        console.error("An error occurred:", error);
        return raw_titles;
    }
}

async function saveAndParseWebpage(country, url) {
    try {
        console.log(`Fetching: ${url}`);
        const response = await axios.get(url);
        const mediaName = new URL(url).hostname;
        const filePath = path.join(__dirname, country, `${mediaName}.html`);

        await fs.writeFile(filePath, response.data, 'utf8');
        console.log(`Saved ${url} to ${filePath}`);
          
    } catch (error) {
        console.error('Error:', error);
    }
}


function useLinks(countries) {
    let selectedLinks = {};
    
    if (countries.includes('all')) {
        // Return all links in newsLinks
        selectedLinks = newsLinks;
    } else {
        // Iterate over each provided country argument
        countries.forEach(country => {
            if (newsLinks.hasOwnProperty(country)) {
                // Add the links for the specified country to the selectedLinks object
                selectedLinks[country] = newsLinks[country];
            } else {
                // Handle case where argument is not a recognized country
                console.log("Invalid argument for", country, ". Please provide a valid country name.");
            }
        });
    }

    return selectedLinks;
}

function checkAndSplitTitles(titles, MAX_TOKENS, encode) {
    // Tokenize all titles and count the total number of tokens
    let totalTokens = 0;
    for(const title of titles) {
        const encoded = encode(title);
        totalTokens += encoded.length;
        const encode_prompt = encode(prompt);
        totalTokens += encode_prompt.length;
    }
    
    // Check if the total number of tokens exceeds the maximum limit
    if (totalTokens > MAX_TOKENS) {
        // If it does, split the titles into two halves and check them separately
        const midIndex = Math.floor(titles.length / 2);
        const firstHalf = titles.slice(0, midIndex);
        const secondHalf = titles.slice(midIndex);

        // Recursively apply the same function to the split title arrays
        // And concatenate the resulting chunks together to get all chunks
        return [
            ...checkAndSplitTitles(firstHalf, MAX_TOKENS, encode),
            ...checkAndSplitTitles(secondHalf, MAX_TOKENS, encode)
        ];
    } else {
        // If it doesn't exceed the limit, return the chunk as is
        return [titles];
    }
}

function calculate_cost_input(gpt_model, nb_tokens){

    if (gpt_model == 'gpt-3') {
        const price = priceGPT3["4k"]["input"]*nb_tokens/1000;
        return price;

    }
    else if (gpt_model == 'gpt-4') {
        const price = priceGPT4["8k"]["input"]*nb_tokens/1000;
        return price;
    }
    return null;
}

function calculate_cost_output(gpt_model, nb_tokens){
    if (gpt_model == 'gpt-3') {
        const price = priceGPT3["4k"]["input"]*nb_tokens/1000;
        return price;

    }
    else if (gpt_model == 'gpt-4') {
        const price = priceGPT4["8k"]["input"]*nb_tokens/1000;
        return price;
    }
    else {
        return null;
    }
    
}


async function getCompletion(prompt, model = MODEL) {
    const headers = {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
    };

    const data = {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
    };
    let retryCount = 0;
    while (retryCount < MAX_RETRIES) {
        try {

            const response = await fetch(OPENAI_ENDPOINT, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });
            if (response.ok) {
                const responseData = await response.json();
                //console.log("responseData: ",responseData);
                return responseData;
            }
            else {
                console.log("Rate limit reached, waiting for 40 seconds...");
                await delay(40000);
                retryCount++;
            }
        } catch (err) {
            console.error("An error occurred:", err);
            return null;
        }
        return null;
    }
           
}


async function processCountryLinks(country, links) {
    console.log(`Processing links for: ${country}`);
    await createDirectory(country);
    const result = {};
    let cost = 0;
    for (const link of links) {
        console.log("---> link: ",link);
        await saveAndParseWebpage(country, link);
        const raw_titles = await getTitles(link);
        if(raw_titles.length >0) {

            // raw_titles.forEach((title, index) => {
            //     console.log(`${index + 1}. ${title}`);
            // });
            const chunks = checkAndSplitTitles(raw_titles, MAX_TOKENS, encode);
            for (const chunk of chunks) {
                //console.log(`Processing chunk: ${chunk.join(' || ')}`);
                
                const message = prompt + chunk.join(' || ');
                try {
                    console.log("Titles sent:");
                    console.log(chunk.join(' || '));
                    console.log(" ");
                    console.log("Interrogating OPENAI....");
                    const responseData = await getCompletion(message, MODEL);
                    if (responseData.choices && responseData.choices.length > 0) {
                        const gpt_answer = responseData.choices[0].message.content;
                        console.log(`gpt answer: ${gpt_answer}`);
                        const input_tokens = responseData.usage["prompt_tokens"];
                        const output_tokens = responseData.usage["completion_tokens"];
                        const gpt_model = responseData.model.substring(0,5);

                        if (input_tokens && output_tokens) {
                            const input_cost =  calculate_cost_input(gpt_model,input_tokens);
                            const output_cost = calculate_cost_output(gpt_model, output_tokens);
                            cost += input_cost + output_cost;
                            console.log("cost: ",cost);
                        }

                        if (gpt_answer.length>0) {
                            result["titles"] = gpt_answer;
                        }

                }
            
                }   catch (error) {
                    console.error(`Error processing chunk}`, error);
                }
            
            console.log("----------------");
            }

        } else {
            console.log('No titles found.');
        }    
        
    }
    result["cost"] = cost;
    return result;
}

function compute_total_cost(cost_dict) {
    let total = 0;
    for (let key in cost_dict) {
        for (let cost of cost_dict[key]) {
            total += cost;
        }
    }
    return total;
}

async function main() {
    
    const countryLinks = useLinks(countryArg);
    for (const country in countryLinks) {
        const result = await processCountryLinks(country, newsLinks[country]);
        const costs = result.cost;
        const titles = result.titles;
        console.log("titles");
        console.log(titles);
        const total_cost = compute_total_cost(costs);
        console.log("TOTAL COST: ",total_cost);

    }

  
}

main().catch(console.error);
