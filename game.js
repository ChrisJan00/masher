var G = {}

////////////////////////
// INIT

function init() {
    initGraphics()
    initGame()
    setCallbacks()
}

function initGraphics() {
    preprareGraphics()
    resetColors()
    if (!canFullscreen())
        document.getElementById("fscontrol").style.display="none"
}

function initGame() {
    resetColors()
    G.focus = 0
    G.scores = [0,0]
    G.maxtime = 22
    G.endDelay = 2.5
    G.punishment = 0.6
    G.timer = G.maxtime
    G.scoreMultiplier = 120
    G.maxscore = (G.timer + 1) * (G.scoreMultiplier + 1)
    G.fails = [[],[]]
    G.lastTime = new Date().getTime()
}

function setCallbacks() {
    G.keyfilter = {}
    G.gamepadPressed = [false, false]
    window.addEventListener( "keydown", keydown, false )
    window.addEventListener( "keyup", keyup, false )
    window.requestAnimationFrame(mainLoop)
    G.canvas.addEventListener( "mousedown", mousedown, false )
}

///////////////////////
// LOGIC

function getDelta(timestamp) {
    if (G.lastTime === undefined) G.lastTime = timestamp
    var dt = (timestamp - G.lastTime) / 1000
    if (dt > 1 || dt<0) dt = 0
    G.lastTime = timestamp
    return dt
}

function mainLoop(timestamp) {
    var dt = getDelta(timestamp)
    updateLogic(dt)
    draw()
    window.requestAnimationFrame(mainLoop)
}

function updateLogic(dt) {
    // poll gamepads
    pollGamepads()

    // update timer in-game
    if (G.focus != 0 && G.timer > 0) {
        G.scores[G.focus-1] = G.scores[G.focus-1] + dt * G.scoreMultiplier
        G.timer = G.timer - dt
    }

    // update fails
    var factor = Math.pow(0.963, dt*60)
    for (var i=0; i<2; i++) {
        for (var j=G.fails[i].length-1; j>=0; j--) {
            G.fails[i][j].alpha = G.fails[i][j].alpha * factor
            if (G.fails[i][j].alpha <= 1/255) {
                G.fails[i].splice(j, 1)
            }
        }
    }

    // update timer after-game
    if (G.timer <= 0)
        G.timer = G.timer - dt
}

function addFail(pl) {
    var sc = Math.min(G.maxscore, G.scores[pl-1] * 2)
    G.fails[pl-1].push( { score : sc, alpha : 1 })
}

function reactPressed(pl) {
    if (G.focus == pl) {
        addFail(pl)
        G.scores[pl-1] = G.scores[pl-1]*G.punishment
    } else {
        G.scores[pl-1] = G.scores[pl-1]+1
    }
    G.focus = pl
}

function keydown(event) {
    var key = String.fromCharCode(event.keyCode)
    if (G.keyfilter[key])
        return
    G.keyfilter[key] = true
    keypressed(key)
}

function keyup(event) {
    var key = String.fromCharCode(event.keyCode)
    G.keyfilter[key] = false
}

function keypressed(key) {
    if (G.timer > 0) {
        if (key == "A")
            reactPressed(1)

        if (key == "L")
            reactPressed(2)
    } else if (G.timer < -G.endDelay) {
        initGame()
    }
}

function mousedown(event) {
    if (G.timer > 0) {
        var x = event.pageX - G.canvas.offsetLeft
        if (x < G.canvas.width * 0.5)
            reactPressed(1)
        else
            reactPressed(2)

    } else if (G.timer < -G.endDelay) {
        initGame()
    }
}

function buttonPressed(gamepad) {
    for (var j=0; j<gamepad.buttons.length; j++) {
        var b = gamepad.buttons[j]
        if (b == 1.0 || (typeof(b) == "object" && b.pressed))
            return true
    }
    return false
}

function pollGamepads() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : [])
    if (!gamepads) {
        return
    }

    var ngamepads = Math.min(2, gamepads.length)
    for (var i=0; i<gamepads.length; i++) {
        if (gamepads[i] != null) {
            ngamepads--
            if (ngamepads < 0)
                break
        } else {
            continue
        }

        if (buttonPressed(gamepads[i])) {
            if (!G.gamepadPressed[i]) {
                G.gamepadPressed[i] = true
                if (G.timer > 0)
                    reactPressed(i+1)
                else if (G.timer < -G.endDelay)
                    initGame()
            }
        } else {
            G.gamepadPressed[i] = false
        }
    }

}

function canFullscreen() {
    return (document.fullscreenEnabled || 
        document.webkitFullscreenEnabled || 
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled)
}

function setFullscreen() {
    if (G.canvas.requestFullscreen) {
        G.canvas.requestFullscreen();
    } else if (G.canvas.webkitRequestFullscreen) {
        G.canvas.webkitRequestFullscreen();
    } else if (G.canvas.mozRequestFullScreen) {
        G.canvas.mozRequestFullScreen();
    } else if (G.canvas.msRequestFullscreen) {
        G.canvas.msRequestFullscreen();
    }
}

////////////////////
// GRAPHICS

function draw() {
    preprareGraphics()
    drawBg()
    drawPlayer(1)
    drawPlayer(2)
    drawTimer()
    drawWinners()
}

function preprareGraphics() {
    G.canvas = document.getElementById("gameCanvas")
    G.ctxt = G.canvas.getContext("2d")
}

function drawBg() {
    G.ctxt.clearRect(0, 0, G.canvas.width, G.canvas.height)
}

function fillCircle(x,y,r) {
    G.ctxt.beginPath()
    G.ctxt.arc(x, y, r, 0, 2*Math.PI)
    G.ctxt.fill()
}

function drawPlayer(pl) {
    var selected = pl == G.focus
    var hue = G.hues[pl]
    var score = G.scores[pl-1]

    // coords
    var sw = G.canvas.width
    var rw = sw * 0.45
    var cx = pl == 1 ? sw * 0.25 : sw * 0.75
    var cy = (sw-rw)*0.5

    // selection rect
    if (selected) {
        setColor(hue, 44, 93)
        G.ctxt.fillRect(cx - rw*0.5, sw*0.5 - rw, rw, rw)
    }

    // fails
    var i = pl-1
    for (var j=0; j<G.fails[i].length; j++) {
        setColor(hue, 100, 20, G.fails[i][j].alpha)
        var rad = Math.sqrt(G.fails[i][j].score / G.maxscore) * rw * 0.5
        fillCircle(cx, cy, rad)
    }
    

    // growing circle
    if (selected) {
        setColor(hue,50,50)
    } else {
        setColor(hue,0,50)
    }
    var rad = Math.sqrt(score/G.maxscore) * rw * 0.5
    fillCircle(cx, cy, rad)

    // score
    var th = 90
    G.ctxt.font = th+'pt Sans-Serif'
    var txt = Math.floor(score)+''
    var tw = G.ctxt.measureText(txt).width

    if (selected) {
        setColor(hue,75,20)
    } else {
        setColor(hue,0,20)
    }

    G.ctxt.fillText(txt, cx - tw*0.5, cy + th*0.5)
}

function drawTimer() {
    if (G.timer <= 0) return

    var hue = G.hues[0]
    var hh = 120
    var yy = G.canvas.height-hh
    var w = (1-G.timer/G.maxtime) * G.canvas.width


    G.ctxt.save()
    G.ctxt.beginPath()
    G.ctxt.rect(w*0.5,yy,G.canvas.width-w,hh)
    G.ctxt.clip()

    setColor(hue,20,20)
    G.ctxt.fillRect(0,yy,G.canvas.width,hh)

    setColor(hue,90,75)
    var th = 90
    G.ctxt.font = th+'pt Sans-Serif'
    var txt = "TIME"
    var xx = (G.canvas.width - G.ctxt.measureText(txt).width)*0.5

    G.ctxt.fillText(txt, xx, G.canvas.height - hh*0.5 + th*0.5)

    G.ctxt.restore()

}

function drawWinners() {
    if (G.timer <= 0) {
        var th = 60
        G.ctxt.font = th+'pt Sans-Serif'

        if (G.scores[0] == G.scores[1]) {
            drawTie()
            return
        }

        var yy = G.canvas.height - 100

        for (var i=0; i<2; i++) {
            var won = G.scores[i] > G.scores[1-i]
            if (won) G.focus = i+1
            var txt = won ? "WINNER" : "LOSER"
            var cx = (0.25 + 0.5*i) * G.canvas.width

            setColor(G.hues[0],25,25)
            var tw = G.ctxt.measureText(txt).width
            G.ctxt.fillText(txt, cx - tw*0.5, yy)
        }
    }

}

function getColor(h,s,l,a) {
    a = a!=undefined? a : 1
    return "hsla("+parseInt(h)+","+s+"%,"+l+"%,"+a+")"
}

function setColor(h,s,l,a) {
    G.ctxt.fillStyle = getColor(h,s,l,a)
}

function resetColors() {
    var h = Math.random()*360

    // 0 : bg   1 : pl1   2 : pl2
    G.hues = [ h, (h+120)%360, (h+240)%360 ]
    
    G.canvas.style.background = getColor(G.hues[0], 33, 85)
    document.body.style.background = getColor(G.hues[0], 9, 60)
    document.getElementById("blurb").style.color = getColor(G.hues[0],20,20)
    var links = document.getElementsByClassName("link")
    for (var i = 0; i < links.length; i++)
        links[i].style.color =  getColor(G.hues[0],20,20)
}
