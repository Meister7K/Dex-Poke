import { fetchWithCache, debounce, Modal, formatters, formatMovesList } from "./utils.js";

class PokemonApp {
  constructor() {
    this.nameList = [];
    this.currentPokemonMoves = [];
    this.modal = new Modal("modal");
    this.setupEventListeners();
    this.init();
  }

  async init() {
    await this.getList();
  }

  async getList() {
    const data = await fetchWithCache("https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0");
    if (data) {
      this.nameList = data.results.map(pokemon => ({
        name: pokemon.name,
        url: pokemon.url
      }));
    }
  }

  filterList(searchTerm) {
    const resultsElement = document.getElementById("results");
    resultsElement.innerHTML = "";
    
    this.nameList
      .filter(pokemon => pokemon.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .forEach(pokemon => {
        const li = document.createElement("li");
        li.textContent = pokemon.name;
        li.addEventListener("click", () => this.displayPokemonData(pokemon));
        resultsElement.appendChild(li);
      });
  }

  filterMoves(searchTerm) {
    const movesList = document.getElementById("movesList");
    if (!movesList || !this.currentPokemonMoves) return;

    const filteredMoves = this.currentPokemonMoves.filter(move =>
      move.move.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    movesList.innerHTML = formatMovesList(filteredMoves);
  }

  async displayPokemonData(pokemonInfo) {
    const pokemonSection = document.querySelector('.pokemon-info');
    
    // If we have a URL, extract the ID from it
    const currentId = pokemonInfo.url ? 
      parseInt(pokemonInfo.url.split('/').filter(Boolean).pop()) : 
      parseInt(pokemonInfo.id);

    const species = await fetchWithCache(pokemonInfo.url);
    
    if (species) {
      this.currentPokemonMoves = species.moves;
      const speciesData = await fetchWithCache(species.species.url);
      
      let evolutionChainHtml = '';
      if (speciesData && speciesData.evolution_chain) {
        const evolutionData = await fetchWithCache(speciesData.evolution_chain.url);
        if (evolutionData) {
          evolutionChainHtml = formatters.evolutionChainData(evolutionData.chain);
        }
      }

      // Create navigation arrows
      const navHtml = `
        <div class="nav-arrows">
          ${currentId > 1 ? 
            `<span class="nav-arrow prev" data-id="${currentId - 1}">←</span>` : 
            '<span class="nav-arrow disabled">←</span>'}
          <span class="current-id">#${currentId}</span>
          <span class="nav-arrow next" data-id="${currentId + 1}">→</span>
        </div>
      `;

      const pokemonHtml = formatters.pokemonData(species);
      pokemonSection.innerHTML = `
        ${navHtml}
        ${pokemonHtml}
        ${evolutionChainHtml}
      `;

      // Add event listeners for navigation
      const arrows = pokemonSection.querySelectorAll('.nav-arrow:not(.disabled)');
      arrows.forEach(arrow => {
        arrow.addEventListener('click', async () => {
          const newId = arrow.dataset.id;
          const newPokemon = { url: `https://pokeapi.co/api/v2/pokemon/${newId}/` };
          await this.displayPokemonData(newPokemon);
        });
      });

      // Add event listeners for Pokemon links
      pokemonSection.querySelectorAll('.pokemon-link').forEach(link => {
        link.addEventListener('click', async () => {
          const speciesUrl = link.dataset.speciesUrl;
          if (speciesUrl) {
            const speciesData = await fetchWithCache(speciesUrl);
            if (speciesData && speciesData.varieties && speciesData.varieties[0]) {
              const defaultVariety = speciesData.varieties.find(v => v.is_default) || speciesData.varieties[0];
              this.displayPokemonData({
                url: defaultVariety.pokemon.url,
                name: defaultVariety.pokemon.name
              });
            }
          }
        });
      });

      const moveSearch = document.getElementById('moveSearch');
      if (moveSearch) {
        moveSearch.addEventListener('input', 
          debounce(e => this.filterMoves(e.target.value), 300)
        );
      }
    } else {
      pokemonSection.textContent = 'Failed to load Pokémon details.';
    }
  }

  setupEventListeners() {
    // Search input listener
    document.getElementById("search").addEventListener(
      "input",
      debounce(e => this.filterList(e.target.value), 300)
    );

    // Modal click listeners
    document.addEventListener("click", async (e) => {
      const url = e.target.dataset.url;
      if (!url) return;

      if (e.target.classList.contains("ability")) {
        this.modal.open(url, formatters.abilityData);
      } else if (e.target.classList.contains("move")) {
        this.modal.open(url, formatters.moveData);
      } else if (e.target.classList.contains("type")) {
        this.modal.open(url, formatters.typeData);
      } else if (e.target.classList.contains("held-item")) {
        this.modal.open(url, formatters.itemData);
      } else if (e.target.classList.contains("species")) {
        this.modal.open(url, formatters.speciesData);
      }
    });
  }
}

// Initialize the app
new PokemonApp();