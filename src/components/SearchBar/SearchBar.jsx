import { useState } from "react"

function SearchBar() {
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
            <button>Search</button>
        </form>
    )
}

export default SearchBar;