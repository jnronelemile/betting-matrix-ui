const fs = require('fs');

let code = fs.readFileSync('src/components/dashboard/TicketsView.jsx', 'utf-8');

// Step 1: Add import and state
code = code.replace(
    "import React, { useState, useMemo } from 'react';",
    "import React, { useState, useMemo } from 'react';\nimport { getTeamInfo } from '../../utils';"
);

code = code.replace(
    "const [activeView, setActiveView] = useState('hub');",
    "const [activeView, setActiveView] = useState('hub');\n  const [expandedTicket, setExpandedTicket] = useState(null);\n  const toggleExpanded = (idx) => setExpandedTicket(expandedTicket === idx ? null : idx);"
);

// Step 2: Fix Alpha Picks UI (Match header replacing plain text)
// Be careful to match exactly what is there.
const alphaSearch = `                    <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1 uppercase truncate">{sel.Match}</h4>`;
const alphaReplace = `                    {(() => {
                      const parts = sel.Match.split(' vs ');
                      const homeTeam = parts[0] || 'Home';
                      const awayTeam = parts[1] || 'Away';
                      const homeInfo = getTeamInfo(homeTeam);
                      const awayInfo = getTeamInfo(awayTeam);
                      return (
                        <div className="flex items-center gap-2 mb-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white truncate text-right">{homeInfo.shortName}</span>
                            <div className="w-5 h-5 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 shadow-sm border border-slate-200 dark:border-slate-700">
                              <img src={homeInfo.logoPath} alt={homeInfo.shortName} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.png'; }} />
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 shrink-0">VS</span>
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-start">
                            <div className="w-5 h-5 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 shadow-sm border border-slate-200 dark:border-slate-700">
                              <img src={awayInfo.logoPath} alt={awayInfo.shortName} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.png'; }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white truncate text-left">{awayInfo.shortName}</span>
                          </div>
                        </div>
                      );
                    })()}`;

code = code.replace(alphaSearch, alphaReplace);

// Step 3: Fix Master Database items using an accordion approach
// In the original, the block we want to replace starts with `{filteredPicks.map((sel, idx) => (`
// and ends after the `</div>` that closes that map function inside the `flex flex-col gap-3` container.
const mapRegex = /\{filteredPicks\.map\(\(sel, idx\) => \([\s\S]*?<\/div>\n\s*\)\)\}/;
const match = code.match(mapRegex);

if (match) {
    const newRender = `{filteredPicks.map((sel, idx) => {
                    const isExpanded = expandedTicket === idx;
                    const parts = sel.Match.split(' vs ');
                    const homeTeam = parts[0] || 'Home';
                    const awayTeam = parts[1] || 'Away';
                    const homeInfo = getTeamInfo(homeTeam);
                    const awayInfo = getTeamInfo(awayTeam);

                    return (
                    <div key={idx} className="flex flex-col bg-white dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all duration-300 hover:border-emerald-500/40 group">
                      {auditMode && (<div className="absolute inset-0 z-50 bg-slate-900/95 p-4 overflow-y-auto"><pre className="text-[8px] font-mono text-emerald-400 whitespace-pre-wrap">{JSON.stringify(sel, null, 2)}</pre></div>)}

                      {/* Always Visible Primary Info */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors" onClick={() => toggleExpanded(idx)}>

                        {/* Teams Info */}
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                <Badge className={\`\${getTierColor(sel.Tier)} text-[7px] px-1.5 py-0.5 rounded-md\`}>T{sel.Tier}</Badge>
                                <span className={\`text-[7px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-1 \${sel.Streak_Status === 'STREAK_CONFIRMED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}\`}>{sel.Streak_Status?.replace('STREAK_', '')}</span>
                                {sel.Alpha && <span className="text-[7px] px-1.5 bg-amber-500 text-white font-black rounded">ALPHA</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                                    <img src={homeInfo.logoPath} alt={homeInfo.shortName} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.png'; }} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[100px] sm:max-w-none">{homeInfo.shortName}</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">VS</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                                    <img src={awayInfo.logoPath} alt={awayInfo.shortName} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.png'; }} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[100px] sm:max-w-none">{awayInfo.shortName}</span>
                                </div>
                            </div>
                        </div>

                        {/* Core Market Info */}
                        <div className="flex items-center gap-4 sm:min-w-[300px] justify-between">
                            <div className="flex flex-col flex-1 min-w-0 pr-4 border-r border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 truncate w-full" title={sel.Marche}>{sel.Marche}</span>
                                <span className="text-[9px] font-black uppercase text-slate-400">{sel.League} | {sel.Heure || 'TBD'}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-bold text-emerald-500">{(sel.Prob*100).toFixed(0)}%</span>
                                  <span className="text-[9px] font-mono font-bold text-slate-400">@{sel.Cote_Ref}</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 transition-transform duration-300">
                                  <ChevronDown size={16} className={\`transform \${isExpanded ? 'rotate-180' : ''}\`} />
                                </div>
                            </div>
                        </div>

                      </div>

                      {/* Collapsible Secondary Info */}
                      <div className={\`overflow-hidden transition-all duration-300 \${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}\`}>
                        <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">

                            {/* Detailed Profiles */}
                            {sel.Profile?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-4 mb-3">
                                    {sel.Profile.map(p => (
                                        <span key={p} className="text-[7px] font-mono text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                            {p.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                                    <span className="text-[8px] text-slate-400 font-mono uppercase mb-1">Score EV</span>
                                    <span className="text-xs font-bold text-emerald-500">{sel.Score_EV?.toFixed(2)}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                                    <span className="text-[8px] text-slate-400 font-mono uppercase mb-1">Family</span>
                                    <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase truncate w-full text-center">{sel.family_name || sel.Type}</span>
                                </div>
                                {sel.Super_Signal && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50 flex flex-col items-center justify-center sm:col-span-2">
                                        <span className="text-[8px] text-amber-500 font-mono uppercase flex items-center gap-1 mb-1"><Zap size={10} /> Super Signal</span>
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">ACTIVE</span>
                                    </div>
                                )}
                            </div>

                            {sel.Streak_Reason && (
                                <div className="mb-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><TrendingUp size={12}/> Reason</h4>
                                    <p className="text-[10px] text-slate-700 dark:text-slate-300 font-mono">{sel.Streak_Reason}</p>
                                </div>
                            )}

                            {sel.Live_Betting_Recommendation?.[0] && (
                                <div className="mb-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 p-3 rounded-xl flex items-start gap-2">
                                    <Clock size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-1">Live Recommendation</span>
                                        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {sel.Live_Betting_Recommendation[0].Signal} - {sel.Live_Betting_Recommendation[0].Argument}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end mt-4">
                                <button onClick={(e) => { e.stopPropagation(); onNavigateToMatch(sel.Match, LEAGUE_NAME_TO_CODE[sel.League] || 'ALL'); }} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-md">
                                    Deep Dive Analysis <ArrowUpRight size={14} />
                                </button>
                            </div>
                        </div>
                      </div>
                    </div>
                  );
             })}`;
    code = code.replace(match[0], newRender);
} else {
    console.log("Could not find filteredPicks map block");
}

// Step 4: Fix Strategy Tickets (ticket.legs map) which also render match names.
// Same approach, use short names and logos instead of raw text.
const legMatchSearch = `<h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase truncate">{leg.Match}</h4>`;
const legMatchReplace = `{(() => {
                        const parts = leg.Match.split(' vs ');
                        const homeTeam = parts[0] || 'Home';
                        const awayTeam = parts[1] || 'Away';
                        const homeInfo = getTeamInfo(homeTeam);
                        const awayInfo = getTeamInfo(awayTeam);
                        return (
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
                              <span className="text-[8px] font-bold text-slate-900 dark:text-white truncate text-right">{homeInfo.shortName}</span>
                              <div className="w-4 h-4 shrink-0 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                <img src={homeInfo.logoPath} alt={homeInfo.shortName} className="w-full h-full object-contain p-0.5" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.png'; }} />
                              </div>
                            </div>
                            <span className="text-[7px] font-mono text-slate-400 shrink-0">VS</span>
                            <div className="flex items-center gap-1 flex-1 min-w-0 justify-start">
                              <div className="w-4 h-4 shrink-0 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                <img src={awayInfo.logoPath} alt={awayInfo.shortName} className="w-full h-full object-contain p-0.5" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.png'; }} />
                              </div>
                              <span className="text-[8px] font-bold text-slate-900 dark:text-white truncate text-left">{awayInfo.shortName}</span>
                            </div>
                          </div>
                        );
                      })()}`;
code = code.replace(legMatchSearch, legMatchReplace);

fs.writeFileSync('src/components/dashboard/TicketsView.jsx', code);
