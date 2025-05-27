import React from "react";
import { ArrowRight } from "lucide-react";

export default function ResultPage({ score, total, onRestart, theme }) {
	return (
		<div className={`entry-page centered ${theme}`}>
			<div className="form-section items-center text-center">
				<h1 className="title mb-4">遊戲結束！</h1>
				<p className="text-lg font-semibold">
					你答對了 <span className="text-orange-500">{score}</span> / {total} 題
				</p>
				<button onClick={onRestart} className="icon-button mt-6">
					<ArrowRight size={32} />
				</button>
			</div>
		</div>
	);
}
