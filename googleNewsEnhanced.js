(async () => {
    const GEMINI_API_KEY = 'PASTE YOUR GOOGLE GENERATIVE LANGUAGE API KEY HERE';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const getDecodedURL = (href) => {
        href = href.replace('./articles/', '');
        href = href.split('?')[0].split('_')[0];

        try {
            let decoded = atob(href);

            const indexOfStartString = decoded.indexOf('http');
            const indexOfEndChar = decoded.indexOf('Ò') == -1 ? decoded.length : decoded.indexOf('Ò');

            if (indexOfEndChar < 5) return null;

            decoded = decoded.substring(indexOfStartString, indexOfEndChar);
            return decoded;

        } catch (e) {
            return null;
        }
    };

    const articles = Array.from(document.querySelectorAll('article'));
    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const links = Array.from(article.querySelectorAll('a[href*=\"./articles/\"]'));
        const targetLink = links.length > 1 ? links[links.length - 1] : links[0];

        if (!targetLink) {
            console.error('No target link found in article');
            continue;
        }

        const href = targetLink.getAttribute('href');
        const title = targetLink.textContent;
        const url = getDecodedURL(href);
        links.forEach(link => link.setAttribute('href', url));

        if (!url) {
            console.error('Failed to decode URL:', href);
            continue;
        }

        console.log(`title: ${title}`);
        console.log(`url: ${url}`);

        try {
            await delay(1000);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `URLに対し、次の手順に従ってステップバイステップで実行してください。
                            1 URLにアクセス出来なかった場合、結果を出力しない
                            2 200字程度に学者のように具体的に要約
                            3 結果のみを出力
                            ${title}のURL: ${url}`
                        }],
                    }]
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const reader = response.body.getReader();
            let decoder = new TextDecoder();
            let result = '';
            let done = false;

            while (!done) {
                const {value, done: doneReading} = await reader.read();
                done = doneReading;
                if (value) {
                    result += decoder.decode(value, {stream: true});
                }
            }
            result += decoder.decode();
            console.log(result);

            let summary;
            try {
                const data = JSON.parse(result);
                summary = data.candidates[0].content.parts[0].text || '';
            } catch (e) {
                console.error('Failed to parse JSON:', result);
                summary = '';
                await delay(5000);
            }

            summary = summary.replace(/\*\*/g, '').replace(/。/g, '●');

            let targetElement = article.querySelector('time');
            if (!targetElement) {
                targetElement = targetLink.nextElementSibling;
                if (!targetElement || targetElement.tagName !== 'SPAN') {
                    console.error('No target element found for summary insertion');
                    continue;
                }
            }

            if (targetElement.tagName === 'TIME') {
                targetElement.style.whiteSpace = 'wrap';
                targetElement.style.alignSelf = 'end';
                targetElement.style.marginRight = '3px';
                targetElement.parentElement.style.height = 'auto';
            } else if (targetElement.tagName === 'SPAN') {
                targetElement.style.marginRight = '-60px';
            }
            let displayText = targetElement.textContent + ' ';
            for (const char of summary) {
                displayText += char + '●';
                targetElement.textContent = displayText;
                await delay(1);
                displayText = displayText.slice(0, -1);
            }
            targetElement.textContent = displayText;
        } catch (error) {
            await delay(5000);
            console.error('Error:', error);
        }
    }
})();
