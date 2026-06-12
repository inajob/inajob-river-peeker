document.addEventListener('DOMContentLoaded', () => {
    let wikiData = [];
    const articleTitle = document.getElementById('article-title');
    const articleBody = document.getElementById('article-body');
    const articleSource = document.getElementById('article-source');
    
    const sidebarAllArticles = document.getElementById('sidebar-all-articles');
    const sidebarSimilarArticles = document.getElementById('sidebar-similar-articles');
    const similarArticlesList = document.querySelector('#sidebar-similar-articles ul');
    const allTitlesList = document.querySelector('#all-titles ul');

    const pageHeader = document.getElementById('page-header');
    const contextMenu = document.getElementById('context-menu');
    const contextMenuSearchButton = document.getElementById('context-menu-search');
    let selectedTextForSearch = ''; 
    let ignoreNextClick = false; 

    // Clicking header returns to "All Articles" mode (clears hash)
    pageHeader.addEventListener('click', () => {
        window.location.hash = '';
    });

    function showContextMenu(x, y, selectedText) {
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.display = 'block';
        selectedTextForSearch = selectedText;
    }

    function hideContextMenu() {
        contextMenu.style.display = 'none';
        selectedTextForSearch = '';
    }

    document.addEventListener('mouseup', (event) => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if (selectedText.length > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            showContextMenu(rect.left + window.scrollX, rect.bottom + window.scrollY + 5, selectedText);
            ignoreNextClick = true;
        } else {
            hideContextMenu();
        }
    });

    document.addEventListener('click', (event) => {
        if (ignoreNextClick) {
            ignoreNextClick = false;
            return;
        }
        if (!contextMenu.contains(event.target) && event.target !== contextMenuSearchButton) {
            hideContextMenu();
        }
    });

    contextMenuSearchButton.addEventListener('click', () => {
        if (selectedTextForSearch) {
            window.location.hash = `#search=${encodeURIComponent(selectedTextForSearch)}`;
        }
        hideContextMenu();
    });

    function cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return -1;
        let dotProduct = 0, magA = 0, magB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            magA += vecA[i] * vecA[i];
            magB += vecB[i] * vecB[i];
        }
        magA = Math.sqrt(magA); magB = Math.sqrt(magB);
        return (magA === 0 || magB === 0) ? 0 : dotProduct / (magA * magB);
    }

    function performSearch(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const results = wikiData.filter(article =>
            article.title.toLowerCase().includes(lowerCaseSearchTerm) ||
            article.body.toLowerCase().includes(lowerCaseSearchTerm)
        );
        renderSearchResults(searchTerm, results);
    }

    function renderSearchResults(searchTerm, results) {
        articleTitle.textContent = `Search Results for "${searchTerm}"`;
        articleSource.style.display = 'none';
        
        // Show All Articles in sidebar when searching
        sidebarAllArticles.style.display = 'block';
        sidebarSimilarArticles.style.display = 'none';

        if (results.length === 0) {
            articleBody.innerHTML = `<p>No articles found matching "${searchTerm}".</p>`;
        } else {
            let resultsHtml = '<ul>';
            results.forEach(article => {
                resultsHtml += `<li><a href="#${encodeURIComponent(article.title)}">${article.title}</a></li>`;
            });
            resultsHtml += '</ul>';
            articleBody.innerHTML = resultsHtml;
        }
    }

    function renderArticle(titleToDisplay) {
        if (wikiData.length === 0) {
            articleTitle.textContent = 'Loading...';
            return;
        }
        const article = wikiData.find(item => item.title === titleToDisplay);
        if (!article) {
            articleTitle.textContent = 'Article Not Found';
            articleBody.innerHTML = '';
            articleSource.textContent = '';
            sidebarSimilarArticles.style.display = 'none';
            sidebarAllArticles.style.display = 'block';
            return;
        }

        articleTitle.textContent = article.title;
        articleSource.textContent = `Source: ${article.source}`;
        articleSource.style.display = 'inline-block';

        // Hide All Articles, Show Similar Articles in sidebar
        sidebarAllArticles.style.display = 'none';
        sidebarSimilarArticles.style.display = 'block';

        let processedBody = article.body.replace(/\[(.*?)\]/g, (match, linkText) => {
            const linkedArticleExists = wikiData.some(item => item.title === linkText);
            return linkedArticleExists 
                ? `<a href="#${encodeURIComponent(linkText)}" class="wiki-link">[${linkText}]</a>`
                : `<a href="#search=${encodeURIComponent(linkText)}" class="wiki-link">[${linkText}]</a>`;
        });
        articleBody.innerHTML = processedBody.replace(/\n/g, '<br>');

        similarArticlesList.innerHTML = '';
        if (article.vec) {
            const similarities = [];
            for (const otherArticle of wikiData) {
                if (otherArticle.id !== article.id && otherArticle.vec) {
                    const similarity = cosineSimilarity(article.vec, otherArticle.vec);
                    if (similarity > 0) similarities.push({ article: otherArticle, similarity: similarity });
                }
            }
            similarities.sort((a, b) => b.similarity - a.similarity);
            similarities.slice(0, 10).forEach(sim => {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = `#${encodeURIComponent(sim.article.title)}`;
                link.textContent = `${sim.article.title} (${(sim.similarity * 100).toFixed(2)}%)`;
                listItem.appendChild(link);
                similarArticlesList.appendChild(listItem);
            });
            if (similarities.length === 0) similarArticlesList.innerHTML = '<li>No similar articles found.</li>';
        } else {
            sidebarSimilarArticles.style.display = 'none';
            sidebarAllArticles.style.display = 'block'; // Fallback to all if no similarities possible
        }
    }

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('load', handleHashChange);

    function handleHashChange() {
        const hash = location.hash;
        if (hash.startsWith('#search=')) {
            const searchTerm = decodeURIComponent(hash.substring('#search='.length));
            performSearch(searchTerm);
        } else if (hash) {
            const title = decodeURIComponent(hash.substring(1));
            renderArticle(title);
        } else if (wikiData.length > 0) {
            // No hash: Show "All Articles" mode
            sidebarAllArticles.style.display = 'block';
            sidebarSimilarArticles.style.display = 'none';
            articleTitle.textContent = 'Discordサーバー「inajob川」の情報をストック化する';
            articleBody.innerHTML = 
                '<p>このページはDiscordサーバ「inajob川」での発言内容をLLMを用いてトピックごとにまとめ、ストック情報としたものです。</p>' +
                '<p>「inajob川」はinajobを中心としたコミュニケーションの場です。電子工作、育児、ポッドキャストなどの話題を扱っています。</p>' +
                '<p>現在はボイスチャットは行っておらず、テキストチャットのみの運用です。</p>' +
                '<div class="welcome-card">' +
                    '<h3>コミュニティに参加する</h3>' +
                    '<p>あなたも「inajob川」で一緒に会話しませんか？</p>' +
                    '<a href="https://discord.gg/9mUunmS" target="_blank" class="cta-button">Discordサーバーに参加する</a>' +
                '</div>';
            articleSource.style.display = 'none';
        }
    }

    fetch('https://better-magenta-vole.myfilebase.com/ipfs/QmU2ys6jrT2Pvrf85k4w3gDN5uBLmNraBwt8hvxix58RdD')
        .then(response => response.json())
        .then(data => {
            wikiData = data;
            allTitlesList.innerHTML = '';
            wikiData.sort((a, b) => {
                const sComp = (a.source || "").localeCompare(b.source || "");
                return sComp !== 0 ? sComp : a.title.localeCompare(b.title);
            }).forEach(article => {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = `#${encodeURIComponent(article.title)}`;
                link.textContent = article.title;
                listItem.appendChild(link);
                allTitlesList.appendChild(listItem);
            });
            handleHashChange();
        })
        .catch(error => {
            console.error('Error loading wiki data:', error);
            articleTitle.textContent = 'Error loading wiki data.';
        });
});
