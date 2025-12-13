(function(){
  function qs(sel,root){ return (root||document).querySelector(sel); }
  function qsa(sel,root){ return Array.from((root||document).querySelectorAll(sel)); }
  function getParams(){ const p=new URLSearchParams(location.search); const out={}; for(const [k,v] of p) out[k]=v; return out; }
  function toast(msg){ if(window.UI&&UI.toast) UI.toast(msg); else alert(msg); }
  function redirect(path){ location.href = path; }
  function fmtCurrency(n){ return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(Number(n||0)); }
  window.AdminUtils = { qs, qsa, getParams, toast, redirect, fmtCurrency };
})();
