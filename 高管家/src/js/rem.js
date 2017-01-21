(function (w,d) {
    function resizeRem() {
        var html  = d.getElementsByTagName("html")[0],
            width = d.body.clientWidth;
        width = width > 750  ? 750 : width;
        html.style.fontSize = (width / 16) + 'px';
    }
    resizeRem();
    window.addEventListener('resize',resizeRem,false);
})(window,document);