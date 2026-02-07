const FONT_FAMILY = "'Press Start 2P','Meiryo',sans-serif";
const ASSETS = {
    image: {
        'red': './images/gazami_180_32.png',
        'blue': './images/benizuwai_180_32.png',
        'yellow': './images/kegani_180_32.png',
        'green': './images/taraba_180_32.png',
        'purple': './images/takaashi_180_32.png',

        'bomb0': './images/bomb_noon_32.png',
        'bomb1': './images/bomb_twilight_32.png',
        'bomb2': './images/bomb_night_32.png',

        'bomb_explosion': './images/kanizsa.png',

        'bg0': './images/bg_02_640x960_128.png',
        'bg1': './images/bg_03_640x960_128.png',
        'bg2': './images/bg_04_640x960_128.png',
        'bg3': './images/bg_05_640x960_128.png',
        'bg4': './images/bg_07_640x960_128.png',
        'bg5': './images/bg_06_640x960_128.png',

        "explosion": "https://iwasaku.github.io/test15/HGYG/resource/expl_48.png",
    },
    spritesheet: {
        "explosion_ss":
        {
            // フレーム情報
            "frame": {
                "width": 48, // 1フレームの画像サイズ（横）
                "height": 48, // 1フレームの画像サイズ（縦）
                "cols": 11, // フレーム数（横）
                "rows": 1, // フレーム数（縦）
            },
            // アニメーション情報
            "animations": {
                "start": { // アニメーション名
                    "frames": Array.range(11), // フレーム番号範囲[0,1,2]の形式でもOK
                    "next": "", // 次のアニメーション。空文字列なら終了。同じアニメーション名ならループ
                    "frequency": 1, // アニメーション間隔
                },
            }
        },
    },
    sound: {
        "explosion_0": "https://iwasaku.github.io/test8/COKS/resource/explosion_0.mp3",
        "explosion_1": "https://iwasaku.github.io/test8/COKS/resource/explosion_1.mp3",
        "explosion_2": "https://iwasaku.github.io/test8/COKS/resource/explosion_2.mp3",
        "explosion_3": "https://iwasaku.github.io/test8/COKS/resource/explosion_3.mp3",
        "explosion_4": "https://iwasaku.github.io/test8/COKS/resource/explosion_4.mp3",
        "explosion_5": "https://iwasaku.github.io/test8/COKS/resource/explosion_5.mp3",
        "explosion_6": "https://iwasaku.github.io/test8/COKS/resource/explosion_6.mp3",
        "gameover": "https://iwasaku.github.io/test11/UT-404/SSS2/resource/t02/12.mp3",
    },
};