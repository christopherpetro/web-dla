/*
 x and y dimensions should be odd so that there is a true center pixel
 */
function generateDla(selector, xdim, ydim, pcount) {
    var vport = $(selector).first();
    var vwidth = vport.width();
    var vheight = vport.height();
    var canvas = vport.get(0);
    canvas.width = xdim + 1;
    canvas.height = ydim + 1;
    var ctx = canvas.getContext("2d");

    var worker = new Worker("dla-asm-worker.js");
    worker.onmessage = function(msg) {
        var data = msg.data;
        if (data == "start") {
        } else if (data == "finish") {
        } else if (Array.isArray(data)) {
            ctx.fillRect(data[0], data[1], 1, 1);
        } else {
            console.log(data);
        }
    }
    worker.postMessage({ xdim: xdim, ydim: ydim, pcount: pcount});
}
