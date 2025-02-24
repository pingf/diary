const MENU_SEL = "sideMenuSelected"
function getSidemenuSelected(level=0) {
    const sel = localStorage.getItem(MENU_SEL)
    if (!sel) return 'ideas'
    if (sel.includes('.') && level===1){
        return sel.split('.')[0]
    }
    if (sel.includes('.') && level===2) {
        return sel.split('.')[0]
    }
    return sel
}
function setSidemenuSelected(value){
    localStorage.setItem(MENU_SEL, value)
}

function clickSidemenu(url, value) {
    setSidemenuSelected(value);

    const el = document.createElement('a');
    el.setAttribute('href', url);
    document.body.appendChild(el);
    el.click();
    el.remove();

    const sel2='SIDEMENU-P-' + value
    const elem = document.getElementById(sel2);
    if (elem) {
        elem.style.backgroundColor="rgba(0.16,0.32, 0.96, 0.32)";
    }
}
