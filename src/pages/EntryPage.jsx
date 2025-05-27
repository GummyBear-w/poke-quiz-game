import React, { useState } from "react";
import "../styles/entry.css";
import { Sun, Moon, ChevronDown } from "lucide-react"; // Icon 套件

export default function EntryPage() {
  const [theme, setTheme] = useState("light");
  const [mode, setMode] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const nextStep = () => {
    if (!mode) return;
    console.log("選擇模式：", mode);
  };

  return (
    <div className={`entry-page centered ${theme}`}>
      <div className="top-bar">
        <h1 className="title text-center w-full">寶可夢大廳</h1>
        <div className="absolute  right-6">
          <button onClick={toggleTheme} className="theme-toggle icon-button">
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>

      </div>

      <div className="form-section">
        <label className="block-label">選擇模式：</label>
        <div className="custom-select" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <span>{mode ? (mode === "quiz" ? "寶可夢問答大賽" : mode) : "請選擇遊戲模式"}</span>
          <ChevronDown size={16} />
          {dropdownOpen && (
            <ul className="custom-select-options">
              <li onClick={() => { setMode("quiz"); setDropdownOpen(false); }}>寶可夢問答大賽</li>
              {/* 未來可新增更多模式 */}
            </ul>
          )}
        </div>

        <button
          onClick={nextStep}
          className={`start-button ${!mode ? "disabled" : ""}`}
          disabled={!mode}
        >
          下一步
        </button>
      </div>
    </div>
  );
}
