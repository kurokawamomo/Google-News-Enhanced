(async () => {
    const GEMINI_API_KEY = 'PASTE YOUR GOOGLE GENERATIVE LANGUAGE API KEY HERE';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ########## Extract URL ##########
    function sendPostRequest(endPoint, param) {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();

            xhr.open("POST", endPoint, true);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    } else if (xhr.status === 400) {
                        reject(Error(xhr.responseText));
                    } else {
                        reject(new Error("Request failed with status " + xhr.status + ": " + xhr.statusText));
                    }
                }
            };
            xhr.send(param);
        });
    }

    const getAtParam = async () => {
        try {
            const endPoint = `/_/DotsSplashUi/data/batchexecute?source-path=%2Fread%2F`;
            const param = `f.req=%5B%5B%5B%22Fbv4je%22%2C%22%5B%5C%22garturlreq%5C%22%2C%5B%5B%5C%22en%5C%22%2C%5C%22US%5C%22%2C%5B%5C%22FINANCE_TOP_INDICES%5C%22%2C%5C%22WEB_TEST_1_0_0%5C%22%5D%2Cnull%2Cnull%2C1%2C1%2C%5C%22US%3Aen%5C%22%2Cnull%2C540%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2C0%2Cnull%2Cnull%2C%5B1717597091%2C738001000%5D%5D%2C%5C%22en%5C%22%2C%5C%22US%5C%22%2C1%2C%5B2%2C3%2C4%2C8%5D%2C1%2C0%2C%5C%22658136446%5C%22%2C0%2C0%2Cnull%2C0%5D%2C%5C%22%5C%22%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&`
            const response = await sendPostRequest(endPoint, param);
            return null;
        } catch (error) {
            const response = error.toString();
            const indexOfStartString = response.indexOf('xsrf') + 7;
            const lengthOfURL = response.substring(indexOfStartString).indexOf('\",');
            return response.substring(indexOfStartString, indexOfStartString + lengthOfURL);
        }
    };

    const getExtractedURL = async (href, atParam) => {
        href = href.replace('./read/', '').split('?')[0].split('_')[0];
        try {
            const endPoint = `/_/DotsSplashUi/data/batchexecute?source-path=%2Fread%2F${href}`;
            const param = `f.req=%5B%5B%5B%22Fbv4je%22%2C%22%5B%5C%22garturlreq%5C%22%2C%5B%5B%5C%22en%5C%22%2C%5C%22US%5C%22%2C%5B%5C%22FINANCE_TOP_INDICES%5C%22%2C%5C%22WEB_TEST_1_0_0%5C%22%5D%2Cnull%2Cnull%2C1%2C1%2C%5C%22US%3Aen%5C%22%2Cnull%2C540%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2C0%2Cnull%2Cnull%2C%5B1717597091%2C738001000%5D%5D%2C%5C%22en%5C%22%2C%5C%22US%5C%22%2C1%2C%5B2%2C3%2C4%2C8%5D%2C1%2C0%2C%5C%22658136446%5C%22%2C0%2C0%2Cnull%2C0%5D%2C%5C%22${href}%5C%22%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&at=${atParam}&`
            const response = await sendPostRequest(endPoint, param);
            const indexOfStartString = response.indexOf('http');
            const lengthOfURL = response.substring(indexOfStartString).indexOf('\",') - 1;
            return response.substring(indexOfStartString, indexOfStartString + lengthOfURL)
                .replace(/\\\\u([a-fA-F0-9]{4})/g, (s, g) => String.fromCharCode(parseInt(g, 16)))
                .replace(/\\u([a-fA-F0-9]{4})/g, (s, g) => String.fromCharCode(parseInt(g, 16)));
        } catch (error) {
            document.querySelector('#gemini-ticker').style.opacity = '0';
            console.error("URL decode error", error);
            return null;
        }
    };

    // ########## Forecast ##########
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            } else {
                reject(new Error("Geolocation is not supported by this browser."));
            }
        });
    }

    function getCityFromCoordinates(latitude, longitude) {
        const apiUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ja`;
        return fetch(apiUrl)
            .then(response => response.json())
            .then(data => data.city)
            .catch(error => {
                console.error('Error fetching the city data:', error);
                throw error;
            });
    }

    async function getCity(position) {
        try {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const city = await getCityFromCoordinates(latitude, longitude);
            return city;
        } catch (error) {
            document.querySelector('#gemini-ticker').style.opacity = '0';
            console.error('Error getting position or city:', error);
            throw error;
        }
    }


    const insertForecastElement = async (forecastLink) => {
        if (forecastLink) {
            const forecast = document.createElement('div');
            forecast.id = 'gemini-forecast';
            forecast.style.maxWidth = '320px';
            forecast.style.marginLeft = '16px';
            forecastLink.parentElement.parentElement.appendChild(forecast);
        }
    };

    const processForecast = async () => {
        const forecastLink = document.querySelector('a[href*="https://weathernews.jp/"]') || 
            document.querySelector('a[href*="https://weather.com/"]');
        if (!forecastLink) return;
        let geo = '全国' ;
        let latitude = null;
        let longitude = null;
        try {
            const position = await getCurrentPosition();
            if (position && position.coords && position.coords.latitude && position.coords.longitude) {
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
            }
            geo = await getCity(position);
        } catch (error) {
            geo = '全国' ;
        }
        console.log(`forecast: ${geo}`);
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                document.querySelector('#gemini-ticker').style.opacity = '1';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `私: URLに対し、次の手順に従ってステップバイステップで実行してください。
                            1 URLにアクセス出来なかった場合、結果を出力しない
                            2 ${(new Date).toString()}の天気に関する情報を抽出
                            3 どのように過ごすべきかを含め、200字程度に具体的に要約
                            4 タイトルや見出しを含めず、結果のみ出力
                            ${geo}の情報: https://weathernews.jp/onebox/${latitude}/${longitude}/
                            あなた:`
                            }],
                        }]
                    }),
                });

                if (!response.ok) throw new Error('Network response was not ok');

                const reader = response.body.getReader();
                let result = '', done = false, decoder = new TextDecoder();
                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;
                    if (value) result += decoder.decode(value, { stream: true });
                }
                result += decoder.decode();

                const data = JSON.parse(result);
                let summary = (data.candidates[0]?.content?.parts[0]?.text || '').replace(/\*\*/g, '').replace(/##/g, '');
                if (summary.length < 80) {
                    console.error('Summary is too short');
                    return;
                } 
                console.log(`forecast: ${summary}`);

                insertForecastElement(forecastLink);
                let targetElement = document.querySelector('#gemini-forecast');
                if (!targetElement) {
                    console.error('No target element found for summary insertion');
                    return;
                }

                let displayText = targetElement.textContent + ' ';
                for (const char of summary) {
                    document.querySelector('#gemini-ticker').style.opacity = '1';
                    displayText += char + '●';
                    targetElement.textContent = displayText;
                    await delay(2);
                    displayText = displayText.slice(0, -1);
                    document.querySelector('#gemini-ticker').style.opacity = '0';
                }
                targetElement.textContent = displayText;
                return;
            } catch (error) {
                document.querySelector('#gemini-ticker').style.opacity = '0';
                await delay(5000);
                console.error('Error:', error);
            }
        }
    };

    // ########## Highlight ##########
    const insertHighlightElement = () => {
        const cWizElements = document.querySelectorAll('main>c-wiz>c-wiz, main>div>c-wiz, main>div>div>c-wiz');
        const validHolders = Array.from(document.querySelectorAll('c-wiz>section, c-wiz>section>div>div')).filter(element => {
            const backgroundColor = getComputedStyle(element).backgroundColor;
            return backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent';         
        });
        if (cWizElements.length >= 2) {
            const targetInsertPosition = cWizElements[1];
            const backgroundColor = getComputedStyle(validHolders[0]).backgroundColor;
            const cWizElement = document.createElement('c-wiz');
            cWizElement.id = 'gemini-highlight';
            cWizElement.style.marginTop = '10px';
            cWizElement.style.marginBottom = '50px';
            cWizElement.style.width = '100%';
            cWizElement.innerHTML = `
                <section>
                    <div style='
                        font-size: 1.5em; 
                        margin-bottom: 10px; 
                        -webkit-background-clip: text!important; 
                        -webkit-text-fill-color: transparent; 
                        background: linear-gradient(to right, #4698e2, #c6657b); 
                        width: fit-content;' id='gemini-highlight-header'>
                        ✦ Geminiによるハイライト
                    </div>
                     <div style='
                        background-color: ${backgroundColor}; 
                        padding: 16px; 
                        border-radius: 15px;' id='gemini-highlight-content'>
                    </div>
                </section>`;
            targetInsertPosition.parentElement.insertBefore(cWizElement, targetInsertPosition);
        }
    };

    const processHighlight = async (urls) => {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                document.querySelector('#gemini-ticker').style.opacity = '1';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `次に示す最新のニュースの中から最も重要なニュース1つに対し5文で深堀りをどうぞ。 ${urls}`
                            }],
                        }]
                    }),
                });

                if (!response.ok) throw new Error('Network response was not ok');

                const reader = response.body.getReader();
                let result = '', done = false, decoder = new TextDecoder();
                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;
                    if (value) result += decoder.decode(value, { stream: true });
                }
                result += decoder.decode();

                const data = JSON.parse(result);
                let summary = (data.candidates[0]?.content?.parts[0]?.text || '').replace(/\*\*/g, '').replace(/##/g, '');
                console.log(`highlights: ${summary}`);

                insertHighlightElement();
                let targetElement = document.querySelector('#gemini-highlight-content');
                if (!targetElement) {
                    console.error('No target element found for summary insertion');
                    return;
                }
            
                let displayText = targetElement.textContent + ' ';
                for (const char of summary) {
                    document.querySelector('#gemini-ticker').style.opacity = '1';
                    displayText += char + '●';
                    targetElement.textContent = displayText;
                    await delay(2);
                    displayText = displayText.slice(0, -1);
                    document.querySelector('#gemini-ticker').style.opacity = '0';
                }
                targetElement.textContent = displayText;
                return;
            } catch (error) {
                document.querySelector('#gemini-ticker').style.opacity = '0';
                await delay(5000);
                console.error('Error:', error);
            }
        }
    };

    // ########## Article ##########
    const processArticle = async (article, links, title, url) => {
        try {
            document.querySelector('#gemini-ticker').style.opacity = '1';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `私: URLに対し、次の手順に従ってステップバイステップで実行してください。
                            1 URLにアクセス出来なかった場合、結果を出力しない
                            2 200字程度に学者のように具体的に要約
                            3 タイトルや見出しを含めず、結果のみを出力
                            ${title}のURL: ${url}
                            あなた:`
                        }],
                    }]
                }),
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const reader = response.body.getReader();
            let result = '', done = false, decoder = new TextDecoder();
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                if (value) result += decoder.decode(value, { stream: true });
            }
            result += decoder.decode();

            const data = JSON.parse(result);
            let summary = (data.candidates[0]?.content?.parts[0]?.text || '').replace(/\*\*/g, '').replace(/##/g, '');
            console.log(`summary: ${summary}`);

            let targetElement = article.querySelector('time') || article.querySelector('span');
            if (!targetElement || !targetElement.tagName) {
                const targetLinks = article.querySelectorAll('a[href*="./read/"]');
                const targetLink = targetLinks.length > 1 ? targetLinks[targetLinks.length - 1] : targetLinks[0];
                const targetElement = document.createElement('span');
                targetElement.style.fontSize = '12px';
                targetElement.style.fontWeight = '200';
                targetElement.style.marginRight = '-90px';
                targetLink.parentElement.appendChild(targetElement);
            }
            
            if (targetElement.tagName === 'TIME') {
                targetElement.style.whiteSpace = 'pre-wrap';
                targetElement.style.alignSelf = 'end';
                targetElement.style.marginRight = '3px';
                targetElement.parentElement.style.height = 'auto';
            } else {
                targetElement.style.marginRight = '-60px';
                targetElement.style.whiteSpace = 'pre-wrap';
            }
            links.forEach(link => link.setAttribute('href', url));

            let displayText = targetElement.textContent + ' ';
            for (const char of summary) {
                document.querySelector('#gemini-ticker').style.opacity = '1';
                displayText += char + '●';
                targetElement.textContent = displayText;
                await delay(2);
                displayText = displayText.slice(0, -1);
                document.querySelector('#gemini-ticker').style.opacity = '0';
            }
            targetElement.textContent = displayText;
        } catch (error) {
            document.querySelector('#gemini-ticker').style.opacity = '0';
            await delay(5000);
            console.error('Error:', error);
        }
    };

    const throttledProcessArticle = async (article, links, title, url, interval) => {
        await delay(interval);
        return processArticle(article, links, title, url);
    };

    // ########## Ticker ##########
    const insertTickerElement = () => {
        if (document.querySelector('#gemini-ticker')) return;
        const ticker = document.createElement('div');
        ticker.id = 'gemini-ticker';
        ticker.style.position = 'fixed';
        ticker.style.right = '20px';
        ticker.style.bottom = '10px';
        ticker.style.fontSize = '1.5em';
        ticker.style.color = '#77777777';
        ticker.style.transition = 'opacity .3s';
        ticker.style.zIndex = '100';
        ticker.innerHTML = '✦';
        document.querySelector('body').appendChild(ticker);
    };

    // ########## Main ##########
    await delay(1000);
    insertTickerElement();
    let atParam = await getAtParam();
    console.log(`atParam: ${atParam}`)
    for (let j = 0; j < 30 ; j++) {
        console.log(`######## attempt: ${j+1} ########`)
        document.querySelector('#gemini-ticker').style.opacity = '1';
        const articles = Array.from(document.querySelectorAll('article'));
        
        if (!document.querySelector('#gemini-forecast')) {
            await processForecast();
            await delay(1000);
        }

        let urls = [];
        if (!document.querySelector('#gemini-highlight')) {
            const promiseHighlight = articles.map(async article => {
                const links = Array.from(article.querySelectorAll('a[href*="./read/"]'));
                const targetLink = links.length > 1 ? links[links.length - 1] : links[0];
                if (!targetLink) return Promise.resolve();
                const href = targetLink.getAttribute('href');
                const title = targetLink.textContent;
                const url = await getExtractedURL(href, atParam);
                urls.push(`${title}: ${url}`);
            })
            await Promise.all(promiseHighlight);
            urls = urls.filter(Boolean).join(' ');
            console.log(`highlight: ${urls}`)
            await processHighlight(urls);
            await delay(1000);
        }

        const allLinks = Array.from(document.querySelectorAll('a[href*="./read/"]'));
        if (allLinks.length == 0) break;

        const promiseArticles = articles.map(async (article, i) => {
            const links = Array.from(article.querySelectorAll('a[href*="./read/"]'));
            const targetLink = links.length > 1 ? links[links.length - 1] : links[0];
            if (!targetLink) return Promise.resolve();

            const href = targetLink.getAttribute('href');
            const title = targetLink.textContent;
            const url = await getExtractedURL(href, atParam);
            console.log(`title: ${title}`);
            console.log(`url: ${url}`);
            if (!url) return Promise.resolve();

            return throttledProcessArticle(article, links, title, url, i * 500);
        });

        await Promise.all(promiseArticles);

        document.querySelector('#gemini-ticker').style.opacity = '0';
        await delay(1000);
    }
    document.querySelector('#gemini-ticker').style.opacity = '0';
    console.log('######## Ended up all ########')
})();
