import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  GlassWater, 
  Coffee, 
  Wind, 
  ThermometerSnowflake, 
  ThermometerSun, 
  Flame, 
  Droplets,
  ChefHat,
  RefreshCcw,
  Sparkles,
  SlidersHorizontal,
  Wand2,
  Download
} from 'lucide-react';

const BeverageGenerator = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Data State
  const [isHalal, setIsHalal] = useState(true); // Default to true (checked)
  const [inspiration, setInspiration] = useState('');
  const [baseIngredients, setBaseIngredients] = useState([]);
  const [baseInput, setBaseInput] = useState('');
  const [characteristics, setCharacteristics] = useState([]);
  
  // Quick Add Options State (Dynamic)
  const [quickAddOptions, setQuickAddOptions] = useState([
    "Espresso", "Cold Brew", "Matcha", "Black Tea", "Green Tea", 
    "Milk", "Oat Milk", "Soda Water", "Coconut Water", 
    "Orange", "Lemon", "Strawberry", "Mango", "Butterfly Pea"
  ]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Now an array of objects: { name: string, match: number, reason: string }
  const [suggestedComplements, setSuggestedComplements] = useState([]); 
  const [unorthodoxComplements, setUnorthodoxComplements] = useState([]);
  // Storing just the names of selected complements
  const [selectedComplements, setSelectedComplements] = useState([]);
  
  const [recipes, setRecipes] = useState([]);
  
  // Refinement State
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [refinementInput, setRefinementInput] = useState('');
  const recipeRef = useRef(null);

  // API Key (injected by environment)
  const apiKey = "AIzaSyCE4XQxNPr2BBOBjyi8tGmgfTlrSFhPr-o"; 

  // --- Constants & Options ---
  
  const characteristicOptions = [
    { label: "Iced", icon: <ThermometerSnowflake size={16} /> },
    { label: "Hot", icon: <ThermometerSun size={16} /> },
    { label: "Fizzy / Squash", icon: <Wind size={16} /> },
    { label: "Creamy", icon: <Coffee size={16} /> },
    { label: "Fruity", icon: <GlassWater size={16} /> },
    { label: "Spicy", icon: <Flame size={16} /> },
    { label: "Sweet", icon: <Droplets size={16} /> },
    { label: "Sour", icon: <Sparkles size={16} /> },
  ];

  // --- API Helpers ---

  const generateContent = async (prompt) => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
            }
          }),
        }
      );

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // --- Logic Handlers ---

  const handleAddBase = (ingredient) => {
    if (ingredient && !baseIngredients.includes(ingredient)) {
      setBaseIngredients([...baseIngredients, ingredient]);
    }
    setBaseInput('');
  };

  const removeBase = (ingredient) => {
    setBaseIngredients(baseIngredients.filter(i => i !== ingredient));
  };

  const toggleCharacteristic = (char) => {
    if (characteristics.includes(char)) {
      setCharacteristics(characteristics.filter(c => c !== char));
    } else {
      setCharacteristics([...characteristics, char]);
    }
  };

  const toggleComplement = (compName) => {
    if (selectedComplements.includes(compName)) {
      setSelectedComplements(selectedComplements.filter(c => c !== compName));
    } else {
      setSelectedComplements([...selectedComplements, compName]);
    }
  };

  const fetchSmartSuggestions = async () => {
    // If inputs are empty, reset to defaults
    if (!inspiration && baseIngredients.length === 0) {
       setQuickAddOptions([
        "Espresso", "Cold Brew", "Matcha", "Black Tea", "Green Tea", 
        "Milk", "Oat Milk", "Soda Water", "Coconut Water", 
        "Orange", "Lemon", "Strawberry", "Mango", "Butterfly Pea"
      ]);
      return;
    }

    setSuggestionsLoading(true);
    try {
      const prompt = `
        Context: Expert Mixologist helper.
        Task: Suggest 15 ingredients that pair scientifically or traditionally well with the provided Inspiration and Current Ingredients to build a complete beverage.
        Inspiration: ${inspiration || "None"}.
        Current Ingredients: ${baseIngredients.join(", ") || "None"}.
        ${isHalal ? "Constraint: Strictly HALAL ingredients only. No alcohol, no pork products." : ""}
        Output: JSON array of strings (e.g. ["Gin", "Tonic", "Lime"]).
        Constraint: Keep it to single ingredients (fruit, liquid, herb, spirit), not full recipes.
      `;
      const result = await generateContent(prompt);
      if (Array.isArray(result)) {
        setQuickAddOptions(result);
      }
    } catch (e) {
      console.error("Failed to update suggestions", e);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Auto-update suggestions when inputs change (Debounced 3s)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSmartSuggestions();
    }, 3000); // Wait 3 seconds for user to stop typing/adjusting

    return () => clearTimeout(timer);
  }, [inspiration, baseIngredients, isHalal]);

  const fetchComplements = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `
        Context: You are an expert mixologist.
        Task: 
        1. Suggest 12 "Scientific" complementary ingredients that pair conventionally well (herbs, syrups, fruits, mixers).
        2. Suggest 4 "Unorthodox" ingredients that are surprising/unusual but used successfully in modern gastronomy (e.g., savory elements, spices, unexpected veggies) to pair with the base.
        
        Base Ingredients: ${baseIngredients.join(", ")}.
        Desired Characteristics: ${characteristics.join(", ")}.
        Inspiration: ${inspiration || "None"}.
        ${isHalal ? "Constraint: Strictly HALAL ingredients only. No alcohol, no pork products." : ""}
        
        Output: A JSON object with two keys: "scientific" and "unorthodox". Both values should be arrays of objects with keys:
        - "name": string
        - "match": number (percentage 0-100)
        - "reason": string (short sentence explaining what flavor dimension this adds or why it pairs well with the selected base)
        
        Example: { "scientific": [{"name": "Mint", "match": 95, "reason": "Adds a refreshing herbal lift."}], "unorthodox": [{"name": "Black Pepper", "match": 85, "reason": "Provides a spicy kick to contrast sweetness."}] }
      `;
      const result = await generateContent(prompt);
      if (result && result.scientific && result.unorthodox) {
        setSuggestedComplements(result.scientific);
        setUnorthodoxComplements(result.unorthodox);
        setStep(3);
      } else {
        throw new Error("Invalid format received");
      }
    } catch (e) {
      setError("Could not generate suggestions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `
        Context: You are an expert mixologist.
        Task: Create 3 distinct, detailed beverage recipes.
        Inputs:
        - Base Ingredients: ${baseIngredients.join(", ")}
        - Complementary Ingredients selected: ${selectedComplements.join(", ")}
        - Characteristics: ${characteristics.join(", ")}
        - Inspiration: ${inspiration || "None"}
        
        Constraints:
        - Use ONLY METRIC units (ml, grams, etc).
        - Be creative but realistic.
        ${isHalal ? "- Strictly HALAL. No alcohol. If inspiration implies alcohol, provide a non-alcoholic alternative." : ""}
        
        Output: A JSON array of 3 objects with this structure:
        {
          "name": "Creative Drink Name",
          "description": "Short appetizing description",
          "ingredients": ["50ml Espresso", "20ml Vanilla Syrup"],
          "instructions": ["Step 1...", "Step 2..."]
        }
      `;
      const result = await generateContent(prompt);
      if (Array.isArray(result)) {
        setRecipes(result);
        setStep(4);
      } else {
        throw new Error("Invalid recipe format");
      }
    } catch (e) {
      setError("Could not generate recipes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefineRecipe = async () => {
    if (!refinementInput.trim() || !selectedRecipe) return;
    setLoading(true);
    try {
      const prompt = `
        Context: Expert Mixologist.
        Task: Modify this specific recipe based on the user's request.
        Original Recipe: ${JSON.stringify(selectedRecipe)}
        User Request: "${refinementInput}"
        
        Constraints: Keep the same JSON structure. Maintain metric units.
        ${isHalal ? "Strictly HALAL. No alcohol." : ""}
        Output: A single JSON object (the updated recipe).
      `;
      const result = await generateContent(prompt);
      if (result && result.name && result.ingredients) {
        setSelectedRecipe(result); // Update the displayed recipe
        setRefinementInput(''); // Clear input
      } else {
        throw new Error("Failed to refine recipe");
      }
    } catch (e) {
      setError("Could not refine the recipe. Try rephrasing.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipeImage = async () => {
    if (!recipeRef.current) return;
    setLoading(true);
    try {
        if (!window.html2canvas) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Ensure render
        const canvas = await window.html2canvas(recipeRef.current, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
        });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `${selectedRecipe?.name?.replace(/\s+/g, '-').toLowerCase() || 'recipe'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error("Screenshot failed", err);
        setError("Could not save image.");
    } finally {
        setLoading(false);
    }
  };

  // --- Step Renderers ---

  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Halal Checkbox */}
      <div className="flex items-center gap-3">
        <input 
          type="checkbox" 
          id="halal" 
          checked={isHalal} 
          onChange={(e) => setIsHalal(e.target.checked)}
          className="w-4 h-4 accent-black rounded border-neutral-300 focus:ring-black"
        />
        <label htmlFor="halal" className="text-xs font-bold uppercase tracking-widest text-neutral-500 cursor-pointer select-none">
          Keep It Halal
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          01. Inspiration (Optional)
        </label>
        <input
          type="text"
          value={inspiration}
          onChange={(e) => setInspiration(e.target.value)}
          placeholder="e.g. 'That purple drink from Starbucks' or 'Mojito twist'"
          className="w-full bg-transparent border-b-2 border-neutral-200 py-3 text-xl focus:border-black focus:outline-none placeholder-neutral-300 transition-colors"
        />
      </div>

      <div className="space-y-4">
        <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          02. Base Ingredients
        </label>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={baseInput}
            onChange={(e) => setBaseInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddBase(baseInput)}
            placeholder="Add custom ingredient..."
            className="flex-1 bg-neutral-50 border border-neutral-200 px-4 py-3 focus:outline-none focus:border-black transition-colors"
          />
          <button 
            onClick={() => handleAddBase(baseInput)}
            className="bg-black text-white px-6 hover:bg-neutral-800 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Selected Bases */}
        {baseIngredients.length > 0 && (
          <div className="flex flex-wrap gap-2 py-2">
            {baseIngredients.map((base, idx) => (
              <span key={idx} className="inline-flex items-center gap-2 bg-neutral-900 text-white px-3 py-1.5 text-sm font-medium rounded-full">
                {base}
                <button onClick={() => removeBase(base)} className="hover:text-neutral-300">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Smart Quick Select */}
        <div className="pt-4 border-t border-neutral-100 mt-4">
          <div className="flex justify-between items-end mb-3">
             <div className="flex items-center gap-2">
                <p className="text-xs text-neutral-400">Quick Select:</p>
                {suggestionsLoading && (
                  <span className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono uppercase animate-pulse">
                    <Sparkles size={10} /> AI Updating...
                  </span>
                )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {quickAddOptions.map((base, idx) => (
              <button
                key={`${base}-${idx}`}
                onClick={() => handleAddBase(base)}
                disabled={baseIngredients.includes(base)}
                className={`px-3 py-1.5 text-sm border border-neutral-200 transition-all ${
                  baseIngredients.includes(base) 
                    ? 'opacity-30 cursor-not-allowed bg-neutral-100' 
                    : 'hover:border-black hover:bg-neutral-50'
                }`}
              >
                {base}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-8 flex justify-end">
        <button
          onClick={() => setStep(2)}
          disabled={baseIngredients.length === 0}
          className="flex items-center gap-3 bg-black text-white px-8 py-4 text-lg font-medium disabled:opacity-50 hover:bg-neutral-800 transition-all"
        >
          Next Step <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          03. Drink Profile
        </label>
        <p className="text-2xl font-light text-neutral-800">
          What kind of vibe are we going for?
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {characteristicOptions.map((char) => {
          const isSelected = characteristics.includes(char.label);
          return (
            <button
              key={char.label}
              onClick={() => toggleCharacteristic(char.label)}
              className={`
                flex flex-col items-center justify-center gap-3 p-6 border transition-all duration-300
                ${isSelected 
                  ? 'bg-black text-white border-black' 
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                }
              `}
            >
              {char.icon}
              <span className="font-medium">{char.label}</span>
            </button>
          );
        })}
      </div>

      <div className="pt-8 flex justify-between items-center">
        <button
          onClick={() => setStep(1)}
          className="text-neutral-500 hover:text-black flex items-center gap-2 px-4 py-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={fetchComplements}
          disabled={loading || characteristics.length === 0}
          className="flex items-center gap-3 bg-black text-white px-8 py-4 text-lg font-medium disabled:opacity-50 hover:bg-neutral-800 transition-all"
        >
          {loading ? (
            <><Loader2 className="animate-spin" size={20} /> Analyzing...</>
          ) : (
            <>Find Complements <ArrowRight size={20} /></>
          )}
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          04. AI Suggestions
        </label>
        <p className="text-2xl font-light text-neutral-800">
          Based on your ingredients, here are some pairings.
        </p>
      </div>

      {/* Section 1: Scientific/Conventional */}
      <div>
        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 border-b border-neutral-100 pb-2">Scientific Pairings</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {suggestedComplements.map((comp, idx) => {
            const isSelected = selectedComplements.includes(comp.name);
            return (
              <button
                key={`sci-${idx}`}
                onClick={() => toggleComplement(comp.name)}
                className={`
                  relative overflow-hidden group px-4 py-3 text-sm text-left border transition-all duration-200 flex flex-col gap-2 h-full
                  ${isSelected 
                    ? 'bg-black text-white border-black shadow-lg translate-y-[-2px]' 
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'
                  }
                `}
              >
                <div className="flex justify-between items-center w-full z-10">
                  <span className="font-medium">{comp.name}</span>
                  {isSelected && <Plus size={14} />}
                </div>
                
                {/* Match Percentage Bar */}
                <div className="w-full space-y-1 z-10">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider opacity-70">
                    <span>Pairing</span>
                    <span>{comp.match}%</span>
                  </div>
                  <div className={`h-1 w-full rounded-full overflow-hidden ${isSelected ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                    <div 
                      className={`h-full transition-all duration-1000 ${isSelected ? 'bg-white' : 'bg-black'}`}
                      style={{ width: `${comp.match}%` }}
                    />
                  </div>
                </div>

                {/* Reason / Flavor Description */}
                <p className={`text-[10px] leading-tight text-left mt-1 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {comp.reason}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Unorthodox */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-4 border-b border-neutral-100 pb-2">
            <Sparkles size={16} className="text-neutral-900"/>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Unorthodox & Avant-Garde</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {unorthodoxComplements.map((comp, idx) => {
            const isSelected = selectedComplements.includes(comp.name);
            return (
              <button
                key={`uno-${idx}`}
                onClick={() => toggleComplement(comp.name)}
                className={`
                  relative overflow-hidden group px-4 py-3 text-sm text-left border-2 transition-all duration-200 flex flex-col gap-2 border-dashed h-full
                  ${isSelected 
                    ? 'bg-neutral-900 text-white border-black shadow-lg translate-y-[-2px] border-solid' 
                    : 'bg-neutral-50 text-neutral-700 border-neutral-300 hover:border-neutral-900 hover:bg-white'
                  }
                `}
              >
                <div className="flex justify-between items-center w-full z-10">
                  <span className="font-medium font-serif italic">{comp.name}</span>
                  {isSelected && <Plus size={14} />}
                </div>
                
                 {/* Match Percentage Bar */}
                <div className="w-full space-y-1 z-10">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider opacity-70">
                    <span>Interest</span>
                    <span>{comp.match}%</span>
                  </div>
                  <div className={`h-1 w-full rounded-full overflow-hidden ${isSelected ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
                    <div 
                      className={`h-full transition-all duration-1000 ${isSelected ? 'bg-white' : 'bg-black'}`}
                      style={{ width: `${comp.match}%` }}
                    />
                  </div>
                </div>

                {/* Reason / Flavor Description */}
                <p className={`text-[10px] leading-tight text-left mt-1 ${isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {comp.reason}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-8 flex justify-between items-center">
         <button
          onClick={() => setStep(2)}
          className="text-neutral-500 hover:text-black flex items-center gap-2 px-4 py-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={fetchRecipes}
          disabled={loading || selectedComplements.length === 0}
          className="flex items-center gap-3 bg-black text-white px-8 py-4 text-lg font-medium disabled:opacity-50 hover:bg-neutral-800 transition-all"
        >
          {loading ? (
            <><Loader2 className="animate-spin" size={20} /> Crafting Recipes...</>
          ) : (
            <>Generate Recipes <ChefHat size={20} /></>
          )}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            05. The Menu
          </label>
          <h2 className="text-3xl font-light mt-1">Select a recipe to customize.</h2>
        </div>
        <button 
          onClick={() => {
            setStep(1);
            setBaseIngredients([]);
            setCharacteristics([]);
            setSelectedComplements([]);
            setSuggestedComplements([]);
            setRecipes([]);
            setInspiration('');
            setSelectedRecipe(null);
            setQuickAddOptions([
                "Espresso", "Cold Brew", "Matcha", "Black Tea", "Green Tea", 
                "Milk", "Oat Milk", "Soda Water", "Coconut Water", 
                "Orange", "Lemon", "Strawberry", "Mango", "Butterfly Pea"
            ]);
          }}
          className="flex items-center gap-2 text-sm font-medium border border-neutral-200 px-4 py-2 hover:bg-neutral-50 transition-colors self-start md:self-auto"
        >
          <RefreshCcw size={14} /> Start Over
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {recipes.map((recipe, idx) => (
          <div key={idx} className="bg-white border border-neutral-200 flex flex-col h-full hover:shadow-xl transition-shadow duration-300 group relative">
            <div className="bg-neutral-50 p-6 border-b border-neutral-100">
              <div className="flex items-center gap-2 mb-3 text-neutral-400">
                <GlassWater size={16} />
                <span className="text-xs font-mono uppercase tracking-widest">Option {idx + 1}</span>
              </div>
              <h3 className="text-2xl font-serif font-medium">{recipe.name}</h3>
              <p className="text-sm text-neutral-500 mt-2 leading-relaxed line-clamp-3">{recipe.description}</p>
            </div>
            
            <div className="p-6 flex-1 flex flex-col gap-6 opacity-70 group-hover:opacity-100 transition-opacity">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-3 border-b border-neutral-100 pb-2">Ingredients</h4>
                <ul className="space-y-2">
                  {recipe.ingredients.slice(0, 4).map((ing, i) => (
                    <li key={i} className="text-sm text-neutral-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full mt-1.5 shrink-0" />
                      {ing}
                    </li>
                  ))}
                  {recipe.ingredients.length > 4 && <li className="text-xs text-neutral-400 italic">+ more</li>}
                </ul>
              </div>
            </div>

            <div className="p-6 pt-0 mt-auto">
                <button 
                  onClick={() => {
                    setSelectedRecipe(recipe);
                    setStep(5);
                  }}
                  className="w-full bg-neutral-900 text-white py-3 flex items-center justify-center gap-2 hover:bg-black transition-colors"
                >
                    Customize <ArrowRight size={16} />
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
       <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setStep(4)}
            className="text-neutral-500 hover:text-black flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Menu
          </button>

          <button
            onClick={handleSaveRecipeImage}
            disabled={loading}
            className="text-neutral-900 hover:text-neutral-600 flex items-center gap-2 font-medium text-sm transition-colors border border-neutral-200 px-4 py-2 rounded-sm bg-white hover:bg-neutral-50"
          >
             {loading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
             Save Recipe
          </button>
       </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left: The Recipe */}
        <div ref={recipeRef} className="flex-1 w-full bg-white border border-neutral-200 p-8 shadow-sm relative">
            <div className="flex items-center gap-2 mb-4 text-neutral-400">
                <ChefHat size={20} />
                <span className="text-xs font-mono uppercase tracking-widest">Selected Recipe</span>
            </div>
            <h2 className="text-4xl font-serif font-medium mb-4">{selectedRecipe.name}</h2>
            <p className="text-neutral-600 mb-8 italic border-l-2 border-black pl-4">{selectedRecipe.description}</p>
            
            <div className="mb-8">
                <h4 className="text-xs font-bold uppercase tracking-widest mb-4 border-b border-neutral-100 pb-2 flex items-center gap-2">
                    <Droplets size={14}/> Ingredients
                </h4>
                <ul className="space-y-3">
                    {selectedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="text-base text-neutral-800 flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-black rounded-full mt-2 shrink-0" />
                        {ing}
                    </li>
                    ))}
                </ul>
            </div>

            <div>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-4 border-b border-neutral-100 pb-2 flex items-center gap-2">
                    <Wind size={14}/> Method
                </h4>
                <ol className="space-y-4">
                    {selectedRecipe.instructions.map((inst, i) => (
                    <li key={i} className="text-base text-neutral-700 leading-relaxed flex gap-4">
                        <span className="font-mono font-bold text-neutral-300 shrink-0 text-lg">0{i + 1}.</span>
                        {inst}
                    </li>
                    ))}
                </ol>
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-100 text-[10px] text-neutral-400 font-mono uppercase text-center">
                 Generated by RekaRasa
             </div>
        </div>

        {/* Right: The Adjustment Control */}
        <div className="w-full md:w-80 shrink-0 sticky top-24 space-y-6">
            <div className="bg-neutral-50 p-6 border border-neutral-200">
                <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2 mb-3">
                    <SlidersHorizontal size={14} /> Adjust Recipe
                </label>
                <p className="text-sm text-neutral-600 mb-4">
                    Not quite right? Tell our AI mixologist how to tweak this specific recipe.
                </p>
                <textarea
                    value={refinementInput}
                    onChange={(e) => setRefinementInput(e.target.value)}
                    placeholder="e.g. 'Make it less sweet', 'Swap soda for tonic', 'Add a spicy kick', 'Remove the dairy'..."
                    className="w-full h-32 p-3 text-sm border border-neutral-200 bg-white focus:outline-none focus:border-black resize-none mb-4"
                />
                <button
                    onClick={handleRefineRecipe}
                    disabled={loading || !refinementInput.trim()}
                    className="w-full bg-black text-white py-3 px-4 flex items-center justify-center gap-2 hover:bg-neutral-800 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                    {loading ? "Refining..." : "Update Recipe"}
                </button>
            </div>

            <div className="bg-neutral-900 text-white p-6 text-center">
                <p className="text-xs font-mono uppercase tracking-widest opacity-60 mb-2">Pro Tip</p>
                <p className="text-sm font-light">
                    You can ask to reverse engineer a flavor or adjust the serving size here too.
                </p>
            </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md border-b border-neutral-100 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-sm">
              <span className="font-serif italic font-bold text-lg">R</span>
            </div>
            <span className="font-medium tracking-tight">RekaRasa</span>
          </div>
          <div className="text-xs font-mono text-neutral-400 hidden sm:block">
            {step === 1 && "Start"}
            {step === 2 && "Profile"}
            {step === 3 && "Pairing"}
            {step === 4 && "Selection"}
            {step === 5 && "Refinement"}
          </div>
        </div>
      </nav>

      {/* Progress Bar */}
      <div className="fixed top-16 left-0 w-full h-1 bg-neutral-100 z-40">
        <div 
          className="h-full bg-black transition-all duration-700 ease-in-out" 
          style={{ width: `${(step / 5) * 100}%` }} 
        />
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-20">
        {error && (
          <div className="mb-8 p-4 border border-red-200 bg-red-50 text-red-800 text-sm rounded flex justify-between items-center">
            {error}
            <button onClick={() => setError(null)}><X size={16}/></button>
          </div>
        )}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-100 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-neutral-400 font-mono">
          REKARASA © {new Date().getFullYear()} • AI-POWERED BEVERAGE ARCHITECT BY THECATLAB
        </div>
      </footer>
    </div>
  );
};

export default BeverageGenerator;