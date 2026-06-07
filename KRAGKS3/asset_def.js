const FONT_FAMILY = "'misaki_gothic','Meiryo',sans-serif";
const ASSETS = {
    image: {
        'red': 'https://iwasaku.github.io/test15/KRAGKS/resource/krag00.png',
        'blue': 'https://iwasaku.github.io/test15/KRAGKS/resource/krag01.png',
        'yellow': 'https://iwasaku.github.io/test15/KRAGKS/resource/krag02.png',
        'green': 'https://iwasaku.github.io/test15/KRAGKS/resource/krag03.png',
        'purple': 'https://iwasaku.github.io/test15/KRAGKS/resource/krag04.png',

        'bomb0': './resource/images/bomb_bunbun.png',
        'bomb1': './resource/images/bomb_murata.png',
        'bomb2': './resource/images/bomb_asumi.png',

        'bg0': './resource/images/bg_01-640-960-64-c.png',
        'bg1': './resource/images/bg_02-640-960-64-c.png',
        'bg2': './resource/images/bg_03-640-960-64-c.png',
        'bg3': './resource/images/bg_04-640-960-64-c.png',
        'bg4': './resource/images/bg_05-640-960-64-c.png',
        'bg5': './resource/images/bg_06-640-960-64-c.png',

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
        "select": "https://iwasaku.github.io/test19/HMHM/resource/se/tap.mp3",
        "gameover": "https://iwasaku.github.io/test11/UT-404/SSS2/resource/t02/12.mp3",
    },
};