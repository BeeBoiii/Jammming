import { useState } from "react"

function SearchBar(prop) {
    const [userInput, setUserInput] = useState('')

    return (
        <form>
            <input 
                placeholder="Enter a song name" 
                name="searchBar" 
                type="search" 
                value={userInput} 
                onChange={(e) => setUserInput(e.target.value)}
            />
            {/*button isn't finished yet*/}
            <button onClick={prop}>Search</button>
        </form>
    )
}

export default SearchBar;