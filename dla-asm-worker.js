onmessage = function (msg) {
    var params = msg.data;
    var xdim = params.xdim;
    var ydim = params.ydim;
    var pcount = params.pcount;

    function draw(x, y) {
        postMessage([x, y]);
    }

    function dlaModule(stdlib, foreign, heap) {
        "use asm";

        var heap8 = new stdlib.Int8Array(heap);
        var heap16 = new stdlib.Int16Array(heap);
        var heap32 = new stdlib.Int32Array(heap);

        var imul = stdlib.Math.imul;
        var draw = foreign.draw;
        var next = foreign.seed | 0;
        var log = foreign.log;

        // stupid simple linear congruential random number generator
        function random(max) {
            max = max | 0;
            var x = 0;

            x = next | 0;
            x = imul(x, 1103515245) | 0;
            x = (x + 12345) | 0;
            next = x | 0;

            return ((x >>> 16) | 0) % (max | 0) | 0;
        }

        function walkdir() {
            var x = 0;
            x = ((random(3) | 0) - 1) | 0;
            return x | 0;
        }

        function min(x, y) {
            x = x | 0;
            y = y | 0;
            var m = 0;
            if ((x | 0) < (y | 0))
                m = x;
            else
                m = y;
            return m | 0;
        }

        function max(x, y) {
            x = x | 0;
            y = y | 0;
            var m = 0;
            if ((x | 0) > (y | 0))
                m = x;
            else
                m = y;
            return m | 0;
        }

        // calculate the heap offset of a particle's coordinates (in bytes)
        function pofs(base, i, xy) {
            base = base | 0;
            i = i | 0;
            xy = xy | 0;
            return (base + ((i << 1 | 0) + (xy | 0)) << 2) | 0;
        }

        function getGrid(x, y, rowbits) {
            x = x | 0;
            y = y | 0;
            rowbits = rowbits | 0;
            var ofs = 0;
            ofs = ((x << rowbits) + y) | 0;
            return heap8[ofs] | 0;
        }

        function setGrid(x, y, rowbits, v) {
            x = x | 0;
            y = y | 0;
            rowbits = rowbits | 0;
            v = v | 0;
            var ofs = 0;
            ofs = ((x << rowbits) + y) | 0;
            heap8[ofs] = v;
        }

        // the extra rowbits parameter must be the base 2 base of the smallest power of two larger than xdim
        // TODO--calculate rowbits internally
        //
        // heap layout. all offsets in bytes since that's what asm.js insists you calculate with (and then do an unnecessary shift).
        //      ofs = 0                             grid            2^rowbits * ydim 8-bit ints, each of which is set to either 0 or 1 (8x more storage than needed; can be optimized to be a bit vector)
        //      ofs = ydim << rowbits               particles       pcount * 2 32-bit ints containing interleaved x and y coords of each particle
        //
        // using 32-bit ints for part just because it might speed up access to them.
        // TODO--test 32 vs. 16 bit particle coordinates
        function run(xdim, rowbits, ydim, pcount) {
            xdim = xdim | 0;
            rowbits = rowbits | 0;
            ydim = ydim | 0;
            pcount = pcount | 0;

            var i = 0;
            var x = 0;
            var y = 0;
            var attach = 0;
            var pleft = 0;
            var xcenter = 0;
            var ycenter = 0;
            var partOfs = 0;

            // the offset of the particle coordinates in the heap. add some padding in case it's not aligned
            partOfs = ((ydim + 1) << rowbits);

            // initialize grid
            for (x = 0; (x | 0) < (xdim | 0); x = (x + 1) | 0) {
                for (y = 0; (y | 0) < (ydim | 0); y = (y + 1) | 0) {
                    heap8[x << rowbits + y] = 0;
                }
            }

            // initialize particles
            for (i = 0; (i | 0) < (pcount | 0); i = (i + 1) | 0) {
                x = random((xdim - 1) | 0) | 0;
                x = (x + 1) | 0;
                y = random((ydim - 1) | 0) | 0;
                y = (y + 1) | 0;
                heap32[(pofs(partOfs, i, 0) | 0) >> 2] = x;
                heap32[(pofs(partOfs, i, 1) | 0) >> 2] = y;
            }
            pleft = pcount;

            // anchor one particle in the center
            xcenter = xdim >> 1;
            ycenter = ydim >> 1;
            setGrid(xcenter | 0, ycenter | 0, rowbits | 0, 1);
            draw(xcenter | 0, ycenter | 0);

            // debug: draw starting position of all particles
    //            for (i = 0; (i | 0) < (pcount | 0); i = (i + 1) | 0) {
    //                x = heap32[(pofs(partOfs, i, 0) | 0) >> 2] | 0;
    //                y = heap32[(pofs(partOfs, i, 1) | 0) >> 2] | 0;
    //                draw((x | 0), (y | 0));
    //            }

            while ((pleft | 0) > 0) {
                for (i = 0; (i | 0) < (pcount | 0); i = (i + 1) | 0) {
                    x = (heap32[(pofs(partOfs, i, 0) | 0) >> 2] | 0) | 0;
                    if ((x | 0) == -1)
                        continue;
                    x = (x + (walkdir() | 0)) | 0;
                    x = min((xdim - 2) | 0, max(x, 1) | 0) | 0;
                    heap32[(pofs(partOfs, i, 0) | 0) >> 2] = x;

                    y = (heap32[(pofs(partOfs, i, 1) | 0) >> 2] | 0) | 0;
                    y = (y + (walkdir() | 0)) | 0;
                    y = min((ydim - 2) | 0, max(y, 1) | 0) | 0;
                    heap32[(pofs(partOfs, i, 1) | 0) >> 2] = y;


                    // TODO--inline getGrid to see if that makes a difference
                    attach = ((getGrid((x - 1) | 0, y, rowbits) | 0) +
                            (getGrid((x + 1) | 0, y, rowbits) | 0) +
                            (getGrid(x, (y - 1) | 0, rowbits) | 0) +
                            (getGrid(x, (y + 1) | 0, rowbits) | 0) +
                            (getGrid((x - 1) | 0, (y - 1) | 0, rowbits) | 0) +
                            (getGrid((x + 1) | 0, (y - 1) | 0, rowbits) | 0) +
                            (getGrid((x + 1) | 0, (y + 1) | 0, rowbits) | 0) +
                            (getGrid((x - 1) | 0, (y + 1) | 0, rowbits) | 0)
                            ) | 0;

                    if ((attach | 0) > 0) {
                        pleft = (pleft - 1) | 0;
                        heap32[(pofs(partOfs, i, 0) | 0) >> 2] = -1;
                        setGrid(x | 0, y | 0, rowbits | 0, 1);
                        draw((x | 0), (y | 0));
                    }
                }
            }
        }

        return { run: run };
    }

    function fakelog(msg) {
        postMessage(msg);
    }

    var rowbits = Math.ceil(Math.log(xdim) / Math.log(2));
    var heapbytes = (ydim << rowbits) + (2 * 4 * pcount) + 8000;
    var heapsize = Math.pow(2, 1 + Math.ceil(Math.log(heapbytes) / Math.log(2)));
    //    var seed = 0xDEADBEEF;
    var seed = (Math.random() * Math.pow(2, 32)) & 0xFFFFFFFF;
    var module = dlaModule(this, { draw: draw, seed: seed, log: fakelog }, new ArrayBuffer(heapsize));
    module.run(xdim, rowbits, ydim, pcount);
}
