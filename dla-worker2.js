var params;
var xdim;
var ydim;
var pcount;
var pleft;
var particles;
var grid;
var showfree;

onmessage = function (msg) {
    var i, x, y, p;
    if (typeof msg.data === "object") {
        params = msg.data;
        xdim = params.xdim;
        ydim = params.ydim;
        pcount = params.pcount;
        showfree = params.showfree;

        // create the grid
        grid = [];
        for (y = 0; y < ydim; y++) {
            var row = [];
            for (x = 0; x < xdim; x++)
                row[x] = 0;
            grid[y] = row;
        }

        // create all the wandering particles. we force them to stay a full pixel away from the walls throughout
        // the code so that we can safely test in all directions without a lot of special case for edges
        particles = [];
        for (i = 0; i < pcount; i++) {
            particles[i] = [Math.floor(Math.random() * (xdim - 2)) + 1, Math.floor(Math.random() * (ydim - 2)) + 1];
        }

        var seeds = [];

        if (params.initial == "center") {
            var xcenter = Math.floor(xdim / 2);
            var ycenter = Math.floor(ydim / 2);
            grid[xcenter][ycenter] = 1;
            seeds.push([xcenter, ycenter, 0]);
        } else if (params.initial = "edges") {
            for (x = 0; x < xdim; x++) {
                grid[x][0] = 1;
                seeds.push([x,0,0]);
                grid[x][ydim - 1] = 1;
                seeds.push([x,ydim - 1,0]);
            }
            for (y = 0; y < ydim; y++) {
                grid[0][y] = 1;
                seeds.push([0,y,0]);
                grid[xdim - 1][y] = 1;
                seeds.push([xdim - 1,y,0]);
            }
        }
        postMessage("start");
        postMessage(seeds);
        pleft = pcount;
    } else {
        if (pleft > 0) {
            var hits = [];
            if (showfree) {
                for (i = 0; i < pcount; i++) {
                    var p = particles[i];
                    if (p === undefined)
                        continue;
                    hits.push([p[0], p[1], 2]);
                }
            }
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
                    particles[i] = undefined;
                    pleft--;
                    hits.push([x, y, 0]);
                    // TODO--move last active particle into this position in the array so we can stop checking for undefined
                }
            }
            if (showfree) {
                for (i = 0; i < pcount; i++) {
                    var p = particles[i];
                    if (p === undefined)
                        continue;
                    hits.push([p[0], p[1], 1]);
                }
            }
            postMessage(hits);
        } else {
            postMessage("finish");
        }
    }
}
