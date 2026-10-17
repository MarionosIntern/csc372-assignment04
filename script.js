
// Initializing maxCast, maxShows, searchUrl, and castUrl

const searchUrl = "https://api.tvmaze.com/search/shows?q=QUERY";
const castUrl = "https://api.tvmaze.com/shows/SHOW_ID/cast";
const max_shows = 10;
const max_cast = 5;

//Accessing html elements through these initialized variables
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const button = document.getElementById("search-button");
const searchStatus = document.getElementById("search-status");
const gallery = document.getElementById("gallery");

let searchCounter = 0;

// function to show a message under the search box. 
// Passing true adds the error class so error messages look different than normal ones
function setStatus(message, isError = false) {
    searchStatus.textContent = message;
    searchStatus.classList.toggle("error", isError);
}

//A function to fetch a url and returns the parsed JSON
//Catches HTTP errors and checks response.ok
async function getJSON(url){
    const response = await fetch(url);
    if(!response.ok){
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return response.json();
}

//A function that turns an error into a message the user can understand
function errorMsg(error){
    if(error.status === 429){
        return "TV Maze is rate-limiting requests. Please try again later.";
    }
    if(error.status){
        return `TV Maze returned an error (${error.status}). Please try again later.`;
    }
    return "Could not reach TV Maze. Please check your internet connection and try again.";
}

// A function that shortens the text and adds ... if its shortened
function shortenText(text, maxLength){
    return text.length > maxLength ? text.slice(0, maxLength).trimEnd() + "..." : text;

}

// A function that uses textcontent to return plain text and DOMParser to read it before displaying it 
function stripHTML(html){
    if(!html){
        return "";
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").trim();
}

//A function that changes the API's YYYY-MM-DD date into MM/DD/YYYY
// Returns a fallback if date is not available or in unexpected format
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

//A function to account for the miliseconds javascript uses since the "updated" value is in seconds
function lastRecord(seconds){
    if(!seconds){
        return "Not Available";
    }
    return new Date(seconds * 1000).toLocaleString();
}

//A function to make creating an element later easier with an optional class and text
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

//A function to return the poster's image
//Returns a fallback if image is unavailable
function makePoster(show){
        const url  = show.image && (show.image.medium || show.image.original);
        const fallback = () => element("div", "poster-fallback", "Image Not Available");
        if(!url){
            return fallback();
        }
        const img = element("img", "poster-img");
        img.src = url;
        img.alt = `Poster for ${show.name}`;
        img.addEventListener("error", () => img.replaceWith(fallback()));
        return img;
    }

//A function to add label/value pairs to a decription list
//Prepares for the second fetch using <dd>
function addRow(list, label, value){
        list.append(element("dt", "", label), element("dd", "", value));
        return list.lastChild;
    }

// A function for the second fetch which loads the cast for one show and fills it's cast row
async function produceCast(showId, castCell){
    try {
        const cast  = await getJSON(castUrl.replace("SHOW_ID",showId));
        const name = cast.map((c) => c.person?.name).filter(Boolean);
        castCell.textContent = name.length ? name.slice(0, max_cast).join(", ") : "Not Available";
    }catch(error){
        castCell.textContent = error.status === 429 ? "Cast Unavailable (i.e. Rate Limited)" : "Not Available";
    }
}

//A function that builds one show card from the given data
function createShowCard(show){

    const card = element("article", "show-card");
    card.append(makePoster(show));

    const body = element("div", "show-card-body");
    body.append(element("h2", "", show.name || "Title Not Available"));

    
    const summary = stripHTML(show.summary);
    body.append(element("p", "show-card-summary", summary ? shortenText(summary, 250) : "summary Not Available"));

    const details = element("dl");
    addRow(details, "Premiered", premierDate(show.premiered));
    addRow(details, "Updated", lastRecord(show.updated));
    addRow(details, "Genres", show.genres && show.genres.length ? show.genres.join(", ") : "Not Available");
    const rating  = show.rating && show.rating.average;
    addRow(details, "Rating", typeof rating === "number" ? `${rating} / 10` : "Not Available");
    const castCell = addRow(details, "Cast", "loading...");
    body.append(details);

    const link = element("a", "", "View on TVmaze");
    link.href = show.url || "https://www.tvmaze.com";
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", `View ${show.name} on TVmaze`);
    body.append(link);
    
    card.append(body);
    return{card, castCell};
}

//A function to run the search, clear the gallery, request shows, request cast, and builds each card
async function handleSearch(query){
    const searchNum = ++searchCounter;
    gallery.replaceChildren();

    if(!query){
        setStatus("Waiting for search.",true);
        return;
    }
    //prevents repeated clicks while loading (error 429 prevetion)
    button.disabled  = true;
    setStatus(`Searching for ${query}...`);

    try{
        const searchResults = await getJSON(searchUrl.replace("QUERY", encodeURIComponent(query)));
        if(searchNum !== searchCounter) {
            return;
        }
        //Keep the first 10 shows and pull out the show with each result that looks like {score, show}
        const shows = searchResults.map((r) => r.show).filter(Boolean).slice(0, max_shows);
        if(shows.length === 0){
            setStatus(`No show found for "${query}". Try another show title or keyword.`);
            return;
        }
        
        setStatus(`Showing ${shows.length} result${shows.length === 1 ? "" : "s"} for "${query}".`);
        shows.forEach((show) => {
            const {card, castCell} = createShowCard(show);
            gallery.append(card);
            produceCast(show.id, castCell);
        });
    
    } catch (error) {
        if(searchNum === searchCounter){
            setStatus(errorMsg(error), true);
        }
    }finally{
        //Runs whether the search worked or failed, it re-enabled the button
        if(searchNum === searchCounter){
            button.disabled = false;
        }
    }
}

//When the form is submitted, stop the page from reloading and run the search
form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSearch(input.value.trim());
});

//Search the defualt value "transformers" when page first loads
handleSearch(input.value.trim());