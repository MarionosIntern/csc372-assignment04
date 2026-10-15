const searchUrl = "https://api.tvmaze.com/search/shows?q=QUERY";
const castUrl = "https://api.tvmaze.com/shows/SHOW_ID/cast";
const max_shows = 10;
const max_cast = 5;

const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const button = document.getElementById("search-button");
const searchStatus = document.getElementById("search-status");
const gallery = document.getElementById("search-gallery");

let searchCounter = 0;

function setStatus(message, isError = false) {
    searchStatus.textContent = message;
    searchStatus.className.toggle("error", isError);
}

async function getJSON(url){
    const repsonse = await fetch(url);
    if(!repsonse.ok){
        const error = new Error(`HTTP error! status: ${repsonse.status}`);
        error.status = repsonse.status;
        throw error;
    }

    return response.json();
}

function errorMsg(error){
    if(error.status === 429){
        return "TV Maze is rate-limiting requests. Please try again later.";
    }
    if(error.status){
        return `TV Maze returned an error (${error.status}). Please try again later.`;
    }
    return "Could not reach TV Maze. Please check your internet connection and try again.";
}

function stripHTML(html){
    if(!html){
        return "";
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").trim();
}

function premierDate(date){
    if(!date){
        return "Not Available";
    }
    const [year, month, day] = date.split("-");
    if(!year || !month || !day){
        return "Not Available";
    }
    return `${month}/${day}/${year}`;
}

function lastRecord(seconds){
    if(!seconds){
        return "Not Available";
    }
    return new Date(seconds * 1000).toLocaleString();
}




function createShowCard(show){
    
    function element(tag, className, text){
        const el = document.createElement(tag);
        if(className){
            el.className = className;
        }
        if(text  !== undefined){
            el.textContent = text;
        }
        return el;
    }

    function makePoster(show){
        const url  = show.image && (show.image.medium || show.image.original);
        const fallback = () => element("div", "poster-fallback", "Image Not Available");
        if(!url){
            return fallback();
        }
        const img = element("img", "poster-img");
        img.src = url;
        img.alt = "Poster-${show.name}";
        img.addEventListener("error", () => img.replaceWith(fallback()));
        return img;
    }

    function addRow(list, label, value){
        list.append(element("dt", "", label))
    }


}

async function handleSearch(query){
    const searchNum = ++searchCounter;
    gallery.replaceChild();

    if(!query){
        setStatus("Enter a show title or keyword.",true);
        return;
    }
    button.disabled  = true;
    setStatus(`Searching for ${query}...`);

    try{
        const searchResults = await getJSON(searchUrl.replace("QUERY", query));
        if(searchNum !== searchCounter) {
            return;
        }
    } catch (error) {
        if(searchNum == searchCounter){
            setStatus(errorMsg(error), true);
        }
    }finally{
        if(searchNum == searchCounter){
            button.disabled = false;
        }
    }

}