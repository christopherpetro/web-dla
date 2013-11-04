onmessage = function (msg) {
    var params = msg.data;
    var xdim = params.xdim;
    var ydim = params.ydim;
    var pcount = params.pcount;
    var i, x, y, p;

    // create the grid
    var grid = [];
    for (y = 0; y < ydim; y++) {
        var row = [];
        for (x = 0; x < xdim; x++)
            row[x] = 0;
        grid[y] = row;
    }

    // create all the wandering particles. we force them to stay a full pixel away from the walls throughout
    // the code so that we can safely test in all directions without a lot of special case for edges
    var particles = [];
    for (i = 0; i < pcount; i++) {
        particles[i] = [Math.floor(Math.random() * (xdim - 1)) + 1, Math.floor(Math.random() * (ydim - 1)) + 1];
    }

    // create one anchored particle
    var xcenter = Math.floor(xdim / 2);
    var ycenter = Math.floor(ydim / 2);
//    var ycenter = ydim - 1;
    grid[xcenter][ycenter] = 1;
    postMessage([xcenter, ycenter]);

    postMessage("start");
    var pleft = pcount;
    while (pleft > 0) {
        for (i = 0; i < pcount; i++) {
            var p = particles[i];
            if (p === undefined)
                continue;

            // random walk
            p[0] = x = Math.max(1, Math.min(xdim - 2, p[0] + Math.floor(Math.random() * 3 - 1)));
            p[1] = y = Math.max(1, Math.min(ydim - 2, p[1] + Math.floor(Math.random() * 3 - 1)));

            // check to see if it's adjacent to an already anchored particle
            if (( grid[x - 1][y] != 0) ||
                    ( grid[x][y - 1] != 0) ||
                    ( grid[x + 1][y] != 0) ||
                    ( grid[x][y + 1] != 0) ||
                    ( grid[x - 1][y - 1] != 0) ||
                    ( grid[x + 1][y - 1] != 0) ||
                    ( grid[x + 1][y + 1] != 0) ||
                    ( grid[x - 1][y + 1] != 0)
                    ) {
                grid[x][y] = 1;
                postMessage([x, y]);
                particles[i] = undefined;
                pleft--;
                // TODO--move last active particle into this position in the array so we can stop checking for undefined
            }
        }
    }
    postMessage("finish");
}
