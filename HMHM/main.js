phina.globalize();

const SCREEN_WIDTH = 640;
const SCREEN_HEIGHT = 960;
const SCREEN_CENTER_X = SCREEN_WIDTH / 2;   // スクリーン幅の半分
const SCREEN_CENTER_Y = SCREEN_HEIGHT / 2;  // スクリーン高さの半分
const HEMA_RADIUS = 45;
const BOMB_RADIUS = HEMA_RADIUS * 1.5;
const BOMB_CHAIN_LENGTH = 7;
const INIT_HEMA_COUNT = 40;
const COLORS = ['red', 'blue', 'yellow', 'green', 'purple'];
const GAME_TIME = 60; // 制限時間（秒）
const COMBO_TIME_LIMIT = 1.0; // コンボ継続時間（秒）
const COMBO_TIME_BONUS = 1; // 5コンボごとのボーナス時間（秒）
const BOMB_TIME_BONUS = 2; // タイムボムのボーナス時間（秒）
const PARTY_GAUGE_MAX = 600; // パーティーゲージ最大値
const PARTY_DECREASE_RATE = 1; // 毎フレームの減少量
const PARTY_PER_HEMA = 20; // ヘマ1個あたりのゲージ増加量
const PARTY_TIME_BONUS = 5; // パーティー突入時のボーナス時間（秒）
const PARTY_SCORE_MULTIPLIER = 3; // パーティー中のスコア倍率

// Box2D設定
let world;
let bodies = [];
let hemaObjects = [];
let bombObjects = [];

let bgSprites = [];

// 表示プライオリティは 0：奥 → 9：手前 の順番
let group0 = null;  // BG
let group1 = null;  // ヘマ
let group2 = null;  // 壁
let group3 = null;  // 爆発
let group4 = null;  // ゲージ
let group5 = null;  // ステータス

// 共有ボタン用
let postText = null;
const postURL = "https://iwasaku.github.io/test19/HMHM/";
const postTags = "#ネムレス";

// ヘマクラス
phina.define('Hema', {
    superClass: 'Sprite',

    init: function (x, y, color) {
        this.superInit(color);
        //this.setSize(HEMA_RADIUS * 2, HEMA_RADIUS * 2);
        this.setSize(270 * 0.5, 180 * 0.5);
        this.setOrigin(0.5, 0.5);

        this.setPosition(x, y);
        this.color = color;
        this.body = null;
        this.selected = false;
        this.setInteractive(true);
    },

    setBody: function (body) {
        this.body = body;
    },

    updateFromBody: function () {
        if (this.body) {
            const pos = this.body.GetPosition();
            this.x = pos.x * 30;
            this.y = pos.y * 30;
            this.rotation = this.body.GetAngle() * (180 / Math.PI);
        }
    },

    highlight: function () {
        this.selected = true;
        this.scaleX = 1.2;
        this.scaleY = 1.2;
    },

    unhighlight: function () {
        this.selected = false;
        this.scaleX = 1.0;
        this.scaleY = 1.0;
    },
});

// ボムクラス
phina.define('Bomb', {
    superClass: 'Sprite',

    init: function (kind, x, y) {
        this.superInit("bomb" + kind);
        this.setSize(BOMB_RADIUS * 2, BOMB_RADIUS * 2);

        this.setPosition(x, y);
        this.body = null;
        this.isBomb = true;
        this.kind = kind;
        this.setInteractive(true);
    },

    setBody: function (body) {
        this.body = body;
    },

    updateFromBody: function () {
        if (this.body) {
            const pos = this.body.GetPosition();
            this.x = pos.x * 30;
            this.y = pos.y * 30;
            this.rotation = this.body.GetAngle() * (180 / Math.PI);
        }
    },
});

phina.define("Explosion", {
    // Spriteを継承
    superClass: 'Sprite',
    // 初期化
    init: function (xpos, ypos, size) {
        // 親クラスの初期化
        this.superInit('explosion', 48, 48);
        // SpriteSheetをスプライトにアタッチ
        var anim = FrameAnimation('explosion_ss').attachTo(this);
        // スプライトシートのサイズにフィットさせない
        anim.fit = false;
        //アニメーションを再生する
        anim.gotoAndPlay('start');
        // サイズ変更
        this.setSize(size, size);

        this.x = xpos;
        this.y = ypos;

        // 参照用
        this.anim = anim;
    },
    // 毎フレーム処理
    update: function () {
        if (this.isGameOver) return;
        // アニメーションが終わったら自身を消去
        if (this.anim.finished) {
            this.remove();
        }
    },
});

// コンボ表示エフェクト
phina.define('ComboEffect', {
    superClass: 'Label',

    init: function (combo, x, y) {
        this.superInit({
            text: combo + ' COMBO!',
            fontSize: 40,
            fontFamily: FONT_FAMILY,
            align: 'center',
            fill: 'yellow',
            stroke: 'orange',
            strokeWidth: 5,
        });

        this.setPosition(x, y);
        this.alpha = 1.0;

        // アニメーション
        this.tweener
            .to({ scaleX: 1.5, scaleY: 1.5 }, 200, 'easeOutQuad')
            .to({ alpha: 0, y: y - 100 }, 500, 'easeInQuad')
            .call(() => {
                this.remove();
            });
    },
});

// パーティーエフェクト
phina.define('PartyEffect', {
    superClass: 'Label',

    init: function (x, y) {
        this.superInit({
            text: 'PARTY TIME!!',
            fontSize: 24,
            fontFamily: FONT_FAMILY,
            fill: '#ff00ff',
            stroke: '#ffff00',
            strokeWidth: 6,
        });

        this.setPosition(x, y);
        this.alpha = 1.0;

        // アニメーション
        this.tweener
            .to({ scaleX: 1.8, scaleY: 1.8 }, 300, 'easeOutQuad')
            .to({ alpha: 0, y: y - 150 }, 700, 'easeInQuad')
            .call(() => {
                this.remove();
            });
    },
});

// タイムボーナスエフェクト
phina.define('TimeBonusEffect', {
    superClass: 'Label',

    init: function (seconds, x, y) {
        this.superInit({
            text: '+' + seconds + ' SEC!',
            fontSize: 50,
            fontFamily: FONT_FAMILY,
            fill: '#00ff00',
            stroke: '#008800',
            strokeWidth: 4,
        });

        this.setPosition(x, y);
        this.alpha = 1.0;

        // アニメーション
        this.tweener
            .to({ scaleX: 1.3, scaleY: 1.3 }, 200, 'easeOutQuad')
            .to({ alpha: 0, y: y - 100 }, 600, 'easeInQuad')
            .call(() => {
                this.remove();
            });
    },
});

// スコアポップアップ
phina.define('ScorePopup', {
    superClass: 'Label',

    init: function (score, x, y, isParty) {
        this.superInit({
            text: '+' + score,
            fontFamily: FONT_FAMILY,
            fontSize: isParty ? 50 : 40,
            fill: isParty ? '#ff00ff' : 'white',
            stroke: isParty ? '#ffff00' : 'black',
            strokeWidth: isParty ? 4 : 3,
        });

        this.setPosition(x, y);
        this.alpha = 1.0;

        // アニメーション
        this.tweener
            .to({ y: y - 80, alpha: 0 }, 800, 'easeOutQuad')
            .call(() => {
                this.remove();
            });
    },
});

/*
*/
phina.define('LoadingScene', {
    superClass: 'DisplayScene',

    init: function (options) {
        this.superInit(options);
        // 背景色
        var self = this;
        var loader = phina.asset.AssetLoader();

        // 明滅するラベル
        let label = phina.display.Label({
            text: "",
            fontSize: 64,
            fill: 'white',
        }).addChildTo(this).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y);

        // ロードが進行したときの処理
        loader.onprogress = function (e) {
            // 進捗具合を％で表示する
            label.text = "{0}%".format((e.progress * 100).toFixed(0));
        };

        // ローダーによるロード完了ハンドラ
        loader.onload = function () {
            // Appコアにロード完了を伝える（==次のSceneへ移行）
            self.flare('loaded');
        };

        // ロード開始
        loader.load(options.assets);
    },

});

/*
 */
phina.define("InitScene", {
    // 継承
    superClass: 'DisplayScene',
    // 初期化
    init: function (option) {
        // 親クラス初期化
        this.superInit(option);
        this.font1 = false;
        this.font2 = false;
    },
    update: function (app) {
        // フォント読み込み待ち
        var self = this;
        document.fonts.load('10pt "Press Start 2P"').then(function () {
            self.font1 = true;
        });
        document.fonts.load('10pt "icomoon"').then(function () {
            self.font2 = true;
        });
        if (this.font1 && this.font2) {
            self.exit();
        }
    }
});

/*
 */
phina.define("TitleScene", {
    // 継承
    superClass: 'DisplayScene',
    // 初期化
    init: function (option) {
        // 親クラス初期化
        this.superInit(option);

        // ラベル
        Label({
            text: 'NMLS',
            fontSize: 60,
            fontFamily: FONT_FAMILY,
            fill: 'white',
        }).addChildTo(this).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y - SCREEN_HEIGHT * 1 / 8 - SCREEN_HEIGHT * 1 / 4);
        Label({
            text: 'HM\nHM',
            fontSize: 160,
            fontFamily: FONT_FAMILY,
            fill: 'white',
        }).addChildTo(this).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y - SCREEN_HEIGHT * 1 / 8);
        Label({
            text: 'TAP TO START',
            fontSize: 40,
            fontFamily: FONT_FAMILY,
            fill: 'white',
        }).addChildTo(this).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y + SCREEN_HEIGHT * 1 / 4);
    },
    // タッチで次のシーンへ
    onpointstart: function () {
        this.exit();
    },
});

// メインシーン
phina.define('MainScene', {
    superClass: 'DisplayScene',

    init: function () {
        that = this;

        this.superInit({
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
        });

        this.backgroundColor = '#000000';

        group0 = DisplayElement().addChildTo(this);   // BG
        group1 = DisplayElement().addChildTo(this);   // ヘマ
        group2 = DisplayElement().addChildTo(this);   // 壁
        group3 = DisplayElement().addChildTo(this);   // 爆発
        group4 = DisplayElement().addChildTo(this);   // ゲージ
        group5 = DisplayElement().addChildTo(this);   // ステータス

        // グローバル変数をクリア
        world = null;
        bodies = [];
        hemaObjects = [];
        bombObjects = [];
        for (let ii = 0; ii < 6; ii++) {
            bgSprites[ii] = Sprite("bg" + ii).addChildTo(group0).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y);
            bgSprites[ii].alpha = 0.0;
        }

        // スコア表示
        this.scoreLabel = Label({
            text: 'Score\n0',
            fontSize: 20,
            fontFamily: FONT_FAMILY,
            align: "right",
            fill: 'white',
            stroke: 'black',
            strokeWidth: 4,
        }).addChildTo(group5).setPosition(SCREEN_WIDTH - 50, 50);

        // タイマー表示
        this.timerLabel = Label({
            text: '' + GAME_TIME,
            fontSize: 80,
            fontFamily: FONT_FAMILY,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 4,
        }).addChildTo(group5).setPosition(SCREEN_WIDTH / 2, 80);

        // コンボ表示
        this.comboLabel = Label({
            text: '',
            fontSize: 50,
            fontFamily: FONT_FAMILY,
            fill: 'yellow',
            stroke: 'orange',
            strokeWidth: 4,
        }).addChildTo(group5).setPosition(SCREEN_WIDTH / 2, 240);

        // パーティーゲージ背景
        RectangleShape({
            width: SCREEN_WIDTH - 80,
            height: 40,
            fill: '#34495e',
            stroke: 'black',
            strokeWidth: 3,
        }).addChildTo(group4).setPosition(SCREEN_WIDTH / 2, 150);

        // パーティーゲージ
        this.partyGauge = RectangleShape({
            width: 0,
            height: 30,
            fill: '#e91e63',
            fill: '#00ff00',
            stroke: null,
        }).addChildTo(group4).setPosition(100, 150);
        this.partyGaugeMaxWidth = SCREEN_WIDTH - (50 * 2);

        // パーティーゲージラベル
        Label({
            text: 'PARTY GAUGE',
            fontSize: 24,
            fontFamily: FONT_FAMILY,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 2,
        }).addChildTo(group4).setPosition(SCREEN_WIDTH / 2, 152);

        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.lastClearTime = 0;
        this.timeSinceLastClear = 0;
        this.chain = [];
        this.isDragging = false;
        this.gameTime = GAME_TIME;
        this.gameOverTime = 10;
        this.isGameOver = false;

        // パーティー関連
        this.partyGaugeValue = 0;
        this.isParty = false;
        this.partyCount = 0;

        // Box2D初期化を待つ
        this.initBox2D();
    },

    initBox2D: function () {
        Box2D().then((Box2D) => {
            this.Box2D = Box2D;

            // 重力設定
            const gravity = new Box2D.b2Vec2(0, 20);
            world = new Box2D.b2World(gravity);

            // 壁の作成
            this.createWalls();

            // ヘマの生成
            this.spawnHemas();

            this.setupEvents();
        });
    },

    createWalls: function () {
        const Box2D = this.Box2D;

        // 左床（斜め）
        const leftGroundDef = new Box2D.b2BodyDef();
        leftGroundDef.set_position(new Box2D.b2Vec2(SCREEN_WIDTH / 4 / 30, SCREEN_HEIGHT * 1.045 / 30));
        leftGroundDef.set_angle(-0.174); // 約-10度
        const leftGround = world.CreateBody(leftGroundDef);
        const leftGroundShape = new Box2D.b2PolygonShape();
        leftGroundShape.SetAsBox(SCREEN_HEIGHT * 1.045 / 2 / 30, 1);
        leftGround.CreateFixture(leftGroundShape, 0);
        // 左床の表示（斜め）
        RectangleShape({
            width: SCREEN_HEIGHT,
            height: 63,
            fill: '#ff0000',
            stroke: '#ff0000',
            strokeWidth: 3,
        }).addChildTo(group2)
            .setPosition(SCREEN_WIDTH / 4, SCREEN_HEIGHT * 1.05)
            .setRotation(-10);

        // 右床（斜め）
        const rightGroundDef = new Box2D.b2BodyDef();
        rightGroundDef.set_position(new Box2D.b2Vec2(SCREEN_WIDTH * 3 / 4 / 30, SCREEN_HEIGHT * 1.045 / 30));
        rightGroundDef.set_angle(0.174); // 約10度
        const rightGround = world.CreateBody(rightGroundDef);
        const rightGroundShape = new Box2D.b2PolygonShape();
        rightGroundShape.SetAsBox(SCREEN_HEIGHT * 1.045 / 2 / 30, 1);
        rightGround.CreateFixture(rightGroundShape, 0);
        // 右床の表示（斜め）
        RectangleShape({
            width: SCREEN_HEIGHT,
            height: 63,
            fill: '#ff0000',
            stroke: '#ff0000',
            strokeWidth: 3,
        }).addChildTo(group2)
            .setPosition(SCREEN_WIDTH * 3 / 4, SCREEN_HEIGHT * 1.05)
            .setRotation(10);

        // 左壁
        const leftWallDef = new Box2D.b2BodyDef();
        leftWallDef.set_position(new Box2D.b2Vec2(-10 / 30, SCREEN_HEIGHT / 2 / 30));
        const leftWall = world.CreateBody(leftWallDef);
        const leftShape = new Box2D.b2PolygonShape();
        leftShape.SetAsBox(1, SCREEN_HEIGHT / 30);
        leftWall.CreateFixture(leftShape, 0);
        // 左壁の表示
        RectangleShape({
            width: 40,
            height: SCREEN_HEIGHT,
            fill: '#ff0000',
            stroke: '#ff0000',
            strokeWidth: 3,
        }).addChildTo(group2).setPosition(-5, SCREEN_HEIGHT / 2);

        // 右壁
        const rightWallDef = new Box2D.b2BodyDef();
        rightWallDef.set_position(new Box2D.b2Vec2((SCREEN_WIDTH + 10) / 30, SCREEN_HEIGHT / 2 / 30));
        const rightWall = world.CreateBody(rightWallDef);
        const rightShape = new Box2D.b2PolygonShape();
        rightShape.SetAsBox(1, SCREEN_HEIGHT / 30);
        rightWall.CreateFixture(rightShape, 0);
        // 右壁の表示
        RectangleShape({
            width: 40,
            height: SCREEN_HEIGHT,
            fill: '#ff0000',
            stroke: '#ff0000',
            strokeWidth: 3,
        }).addChildTo(group2).setPosition(SCREEN_WIDTH + 5, SCREEN_HEIGHT / 2);
    },

    spawnHemas: function () {
        const Box2D = this.Box2D;

        for (let i = 0; i < INIT_HEMA_COUNT; i++) {
            const x = Math.random() * (SCREEN_WIDTH - 150) + 50;
            const y = Math.random() * 300 + 200;
            const color = COLORS[Math.floor(Math.random() * 3)];

            const hema = Hema(x, y, color).addChildTo(group1);

            // Box2Dボディの作成
            const bodyDef = new Box2D.b2BodyDef();
            bodyDef.set_type(Box2D.b2_dynamicBody);
            bodyDef.set_position(new Box2D.b2Vec2(x / 30, y / 30));

            const body = world.CreateBody(bodyDef);

            const shape = new Box2D.b2CircleShape();
            shape.set_m_radius(HEMA_RADIUS / 30);

            const fixtureDef = new Box2D.b2FixtureDef();
            fixtureDef.set_shape(shape);
            fixtureDef.set_density(1.0);
            fixtureDef.set_friction(0.3);
            fixtureDef.set_restitution(0.3);

            body.CreateFixture(fixtureDef);

            hema.setBody(body);
            hemaObjects.push(hema);
            bodies.push(body);
        }
    },

    setupEvents: function () {
        this.on('pointstart', (e) => {
            if (!this.isGameOver) {
                this.isDragging = true;
                this.checkHemaTouch(e.pointer.x, e.pointer.y);
            }
        });

        this.on('pointmove', (e) => {
            if (this.isDragging && !this.isGameOver) {
                this.checkHemaTouch(e.pointer.x, e.pointer.y);
            }
        });

        this.on('pointend', () => {
            if (!this.isGameOver) {
                this.isDragging = false;
                this.clearChain();
            }
        });
    },

    checkHemaTouch: function (x, y) {
        hemaObjects.forEach((hema) => {
            if (!hema.removed) {
                const dx = hema.x - x;
                const dy = hema.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < HEMA_RADIUS) {
                    if (this.chain.length === 0) {
                        // 最初のヘマ
                        this.chain.push(hema);
                        hema.highlight();
                    } else {
                        const lastHema = this.chain[this.chain.length - 1];

                        // 同じ色で、まだチェーンに入っていない
                        if (hema.color === lastHema.color && !this.chain.includes(hema)) {
                            // 距離チェック
                            const dx2 = hema.x - lastHema.x;
                            const dy2 = hema.y - lastHema.y;
                            const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

                            if (distance2 < HEMA_RADIUS * 3) {
                                this.chain.push(hema);
                                hema.highlight();
                            }
                        }
                    }
                }
            }
        });
    },

    clearChain: function () {
        if (this.chain.length >= 3) {
            // コンボ判定（パーティー中は無制限）
            if (this.isParty || this.timeSinceLastClear < COMBO_TIME_LIMIT) {
                this.combo++;
            } else {
                this.combo = 1;
            }

            // 最大コンボ更新
            if (this.combo > this.maxCombo) {
                this.maxCombo = this.combo;
            }

            // コンボ表示更新
            if (this.combo > 1) {
                this.comboLabel.text = this.combo + ' COMBO!';
                this.comboLabel.scaleX = 1.3;
                this.comboLabel.scaleY = 1.3;

                // パーティー中は色を変える
                if (this.isParty) {
                    this.comboLabel.fill = '#ff00ff';
                    this.comboLabel.stroke = '#ffff00';
                } else {
                    this.comboLabel.fill = 'yellow';
                    this.comboLabel.stroke = 'orange';
                }

                this.comboLabel.tweener.clear()
                    .to({ scaleX: 1.0, scaleY: 1.0 }, 200);

                // コンボエフェクト
                if (this.combo % 5 === 0) {
                    ComboEffect(this.combo, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2).addChildTo(group5);
                    this.gameTime += COMBO_TIME_BONUS;
                    TimeBonusEffect(COMBO_TIME_BONUS, SCREEN_WIDTH / 2, 100).addChildTo(group5);
                }
            } else {
                this.comboLabel.text = '';
            }

            // パーティーゲージ増加（ヘマ1個につき20）
            this.partyGaugeValue += this.chain.length * PARTY_PER_HEMA;
            if (this.partyGaugeValue > PARTY_GAUGE_MAX) {
                this.partyGaugeValue = PARTY_GAUGE_MAX;
            }

            // パーティー突入判定
            if (this.partyGaugeValue >= PARTY_GAUGE_MAX) {
                this.enterParty();
            }

            // 最終クリア時刻を記録
            this.lastClearTime = this.gameTime;
            this.timeSinceLastClear = 0;

            // チェーン数に応じた中心座標を計算
            let centerX = 0;
            let centerY = 0;
            this.chain.forEach((hema) => {
                centerX += hema.x;
                centerY += hema.y;
            });
            centerX /= this.chain.length;
            centerY /= this.chain.length;

            // 7チェーン以上でボム生成
            const shouldCreateBomb = this.chain.length >= BOMB_CHAIN_LENGTH;

            // 3つ以上つながっていたら消す
            this.chain.forEach((hema) => {
                // スコア加算（コンボボーナス + パーティーボーナス付き）
                const baseScore = 10;
                const comboBonus = (this.combo - 1) * 5;
                let totalScore = baseScore + comboBonus;

                // パーティー中は3倍
                if (this.isParty) {
                    totalScore *= PARTY_SCORE_MULTIPLIER;
                }

                this.score += totalScore;

                // Box2Dから削除
                if (hema.body) {
                    world.DestroyBody(hema.body);
                }

                // 配列から削除
                const index = hemaObjects.indexOf(hema);
                if (index > -1) {
                    hemaObjects.splice(index, 1);
                }

                // 爆発表示
                Explosion(hema.x, hema.y, HEMA_RADIUS * 2).addChildTo(group3);

                // 画面から削除
                hema.remove();
            });
            SoundManager.play("explosion_" + myRandom(0, 6));

            // スコアポップアップ表示
            let chainScore = this.chain.length * 10 + (this.combo - 1) * this.chain.length * 5;
            if (this.isParty) {
                chainScore *= PARTY_SCORE_MULTIPLIER;
            }
            ScorePopup(chainScore, centerX, centerY, this.isParty).addChildTo(group5);

            this.scoreLabel.text = 'Score\n' + this.score;

            // ボム生成
            if (shouldCreateBomb) {
                if (this.chain.length <= 8) {
                    // 7~8
                    this.createBomb(0, centerX, centerY);
                } else if (this.chain.length <= 10) {
                    // 9~10
                    this.createBomb(1, centerX, centerY);
                } else {
                    // 11～
                    this.createBomb(2, centerX, centerY);
                }
            }

            // 新しいヘマを追加
            this.addNewHemas(this.chain.length);
        } else {
            // ハイライト解除
            this.chain.forEach((hema) => {
                hema.unhighlight();
            });
        }

        this.chain = [];
    },

    enterParty: function () {
        this.isParty = true;
        this.partyCount++;
        this.partyGaugeValue = PARTY_GAUGE_MAX;

        // 制限時間に5秒加算
        this.gameTime += PARTY_TIME_BONUS;
        if (this.gameTime > GAME_TIME) {
            this.gameTime = GAME_TIME;
        }

        // パーティーエフェクト
        PartyEffect(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 100).addChildTo(group5);

        // タイムボーナスエフェクト
        TimeBonusEffect(PARTY_TIME_BONUS, SCREEN_WIDTH / 2, 100).addChildTo(group5);

        // 背景色変更
        this.backgroundColor = '#ffe0f0';

        // 背景BGをフェードイン
        let bgIndex = this.partyCount % 6;
        let bgIndexOld = bgIndex - 1;
        if (bgIndexOld < 0) bgIndexOld = 5;
        if (bgSprites[bgIndexOld].alpha > 0.0) {
            bgSprites[bgIndexOld].tweener.to({ alpha: 0.0 }, 500).play();
        }
        bgSprites[bgIndex].tweener.to({ alpha: 1.0 }, 500).play();
    },

    updatePartyGauge: function () {
        // ゲームオーバー時は更新しない
        if (this.isGameOver) return;

        // パーティー中でない場合、毎フレーム減少
        if (!this.isParty) {
            this.partyGaugeValue -= PARTY_DECREASE_RATE;
            if (this.partyGaugeValue < 0) {
                this.partyGaugeValue = 0;
            }
        } else {
            // パーティー中は減少
            this.partyGaugeValue -= PARTY_DECREASE_RATE * 2;
            if (this.partyGaugeValue <= 0) {
                this.exitParty();
            }
        }

        // ゲージ表示更新（横向き）
        const ratio = this.partyGaugeValue / PARTY_GAUGE_MAX;
        this.partyGauge.width = this.partyGaugeMaxWidth * ratio;
        this.partyGauge.x = 50 + (this.partyGauge.width / 2);

        // ゲージの色変更
        if (this.isParty) {
            this.partyGauge.fill = '#ff00ff';
        } else if (ratio >= 1.0) {
            this.partyGauge.fill = '#ffff00';
        } else if (ratio > 0.7) {
            this.partyGauge.fill = '#ff6600';
        } else {
            this.partyGauge.fill = '#00ff00';
        }
    },

    exitParty: function () {
        this.isParty = false;
        this.partyGaugeValue = 0;

        // 背景色を戻す
        this.backgroundColor = '#000000';

        // コンボ表示の色を戻す
        this.comboLabel.fill = 'yellow';
        this.comboLabel.stroke = 'orange';

        // 背景BGをフェードアウト
        let bgIndex = this.partyCount % 6;
        bgSprites[bgIndex].tweener.to({ alpha: 0.0 }, 500).play();
    },

    addNewHemas: function (count) {
        const Box2D = this.Box2D;

        for (let i = 0; i < count; i++) {
            const x = Math.random() * (SCREEN_WIDTH - 150) + 50;
            const y = -50 - i * 60;
            let colorMax;
            if (this.score >= 30000) colorMax = 5;
            else if (this.score >= 10000) colorMax = 4;
            else colorMax = 3;
            const color = COLORS[Math.floor(Math.random() * colorMax)];

            const hema = Hema(x, y, color).addChildTo(group1);

            const bodyDef = new Box2D.b2BodyDef();
            bodyDef.set_type(Box2D.b2_dynamicBody);
            bodyDef.set_position(new Box2D.b2Vec2(x / 30, y / 30));

            const body = world.CreateBody(bodyDef);

            const shape = new Box2D.b2CircleShape();
            shape.set_m_radius(HEMA_RADIUS / 30);

            const fixtureDef = new Box2D.b2FixtureDef();
            fixtureDef.set_shape(shape);
            fixtureDef.set_density(1.0);
            fixtureDef.set_friction(0.3);
            fixtureDef.set_restitution(0.3);

            body.CreateFixture(fixtureDef);

            hema.setBody(body);
            hemaObjects.push(hema);
            bodies.push(body);
        }
    },

    createBomb: function (kind, x, y) {
        const Box2D = this.Box2D;
        const bomb = Bomb(kind, x, y).addChildTo(group1);

        // Box2Dボディの作成
        const bodyDef = new Box2D.b2BodyDef();
        bodyDef.set_type(Box2D.b2_dynamicBody);
        bodyDef.set_position(new Box2D.b2Vec2(x / 30, y / 30));

        const body = world.CreateBody(bodyDef);

        const shape = new Box2D.b2CircleShape();
        shape.set_m_radius(BOMB_RADIUS / 30);

        const fixtureDef = new Box2D.b2FixtureDef();
        fixtureDef.set_shape(shape);
        fixtureDef.set_density(1.0);
        fixtureDef.set_friction(0.3);
        fixtureDef.set_restitution(0.3);

        body.CreateFixture(fixtureDef);

        bomb.setBody(body);
        bombObjects.push(bomb);
        bodies.push(body);

        // ボムのタップイベント
        bomb.on('pointstart', () => {
            if (!this.isGameOver) {
                this.explodeBomb(bomb);
            }
        });
    },

    explodeBomb: function (bomb) {
        const bombX = bomb.x;
        const bombY = bomb.y;
        const explosionRadius = HEMA_RADIUS * 4;

        // 隣接するヘマを検索して消す
        const hemasToClear = [];
        hemaObjects.forEach((hema) => {
            const dx = hema.x - bombX;
            const dy = hema.y - bombY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= explosionRadius) {
                hemasToClear.push(hema);
            }
        });

        // ヘマを消す
        let totalScore = 0;
        hemasToClear.forEach((hema) => {
            // スコア加算
            let score = 50;

            // スコアボム
            if (bomb.kind === 2) {
                score *= 2;
            }
            if (this.isFever) {
                score *= FEVER_SCORE_MULTIPLIER;
            }
            totalScore += score;
            this.score += score;

            // パーティーゲージ増加
            this.partyGaugeValue += PARTY_PER_HEMA;
            if (this.partyGaugeValue > PARTY_GAUGE_MAX) {
                this.partyGaugeValue = PARTY_GAUGE_MAX;
            }

            // Box2Dから削除
            if (hema.body) {
                world.DestroyBody(hema.body);
            }

            // 配列から削除
            const index = hemaObjects.indexOf(hema);
            if (index > -1) {
                hemaObjects.splice(index, 1);
            }
            // 爆発表示
            Explosion(hema.x, hema.y, HEMA_RADIUS * 2).addChildTo(group3);

            // 画面から削除
            hema.remove();
        });

        // タイムボム
        if (bomb.kind === 1) {
            this.gameTime += BOMB_TIME_BONUS;
            TimeBonusEffect(BOMB_TIME_BONUS, SCREEN_WIDTH / 2, 100).addChildTo(group5);
        }

        // スコア表示更新
        this.scoreLabel.text = 'Score\n' + this.score;

        // 爆発音＆スコアポップアップ
        if (totalScore > 0) {
            SoundManager.play("explosion_" + myRandom(0, 6));
            ScorePopup(totalScore, bombX, bombY, this.isFever).addChildTo(this);
        }

        // 新しいヘマを追加
        this.addNewHemas(hemasToClear.length);

        // ボムを削除
        if (bomb.body) {
            world.DestroyBody(bomb.body);
        }

        const bombIndex = bombObjects.indexOf(bomb);
        if (bombIndex > -1) {
            bombObjects.splice(bombIndex, 1);
        }

        bomb.remove();

        // 爆発エフェクト
        const explosion = Sprite("bomb_explosion").addChildTo(group3);
        explosion.setPosition(bombX, bombY);
        explosion.scaleX = 0.0;
        explosion.scaleY = 0.0;
        explosion.alpha = 1.0;
        explosion.rotation = 0;
        explosion.tweener
            .to({ scaleX: 1.1, scaleY: 1.1, alpha: 0.0, rotation: 90 }, 600, 'easeOutQuad')
            .call(() => {
                explosion.remove();
            });

    },


    updateTimer: function () {
        if (this.isGameOver) {
            this.gameOverTime -= 1 / 60;
            this.gameOver();
            return;
        }

        this.gameTime -= 1 / 60;

        if (this.gameTime <= 0) {
            this.gameTime = 0;
            this.gameOverInit();
        }

        // タイマー表示更新
        const seconds = Math.ceil(this.gameTime);
        this.timerLabel.text = '' + seconds;
    },

    updateComboTimer: function () {
        // パーティー中はコンボが途切れない
        if (this.isParty) {
            this.timeSinceLastClear = 0;
            return;
        }

        // 最後にヘマを消してからの経過時間を更新
        this.timeSinceLastClear += 1 / 60;

        // コンボが途切れた場合
        if (this.timeSinceLastClear >= COMBO_TIME_LIMIT && this.combo > 0) {
            this.combo = 0;
            this.comboLabel.text = '';
        }
    },

    gameOverInit: function () {
        this.isGameOver = true;

        postText = "HxMx HxMx\nスコア: " + this.score;
        if (this.maxCombo > 0) postText += ("\n最大コンボ: " + this.maxCombo);
        if (this.partyCount > 0) postText += ("\nパーティー回数: " + this.partyCount);

        // X
        this.xButton = Button(
            {
                text: String.fromCharCode(0xe902),
                fontSize: 32,
                fontFamily: "icomoon",
                fill: "#7575EF",  // ボタン色
                stroke: '#DEE3FF',         // 枠色
                strokeWidth: 5,         // 枠太さ
                cornerRadius: 8,
                width: 64,
                height: 64,
            }
        ).addChildTo(group5).setPosition(SCREEN_CENTER_X - (SCREEN_CENTER_X / 2) - 80, SCREEN_CENTER_Y + (SCREEN_CENTER_Y / 2));
        this.xButton.onclick = function () {
            // https://developer.x.com/en/docs/twitter-for-websites/tweet-button/guides/web-intent
            let shareURL = "https://x.com/intent/tweet?text=" + encodeURIComponent(postText + "\n" + postTags + "\n") + "&url=" + encodeURIComponent(postURL);
            window.open(shareURL);
        };
        this.xButton.alpha = 0.0;
        this.xButton.sleep();

        // threads
        this.threadsButton = Button(
            {
                text: String.fromCharCode(0xe901),
                fontSize: 32,
                fontFamily: "icomoon",
                fill: "#7575EF",  // ボタン色
                stroke: '#DEE3FF',         // 枠色
                strokeWidth: 5,         // 枠太さ
                cornerRadius: 8,
                width: 64,
                height: 64,
            }
        ).addChildTo(group5).setPosition(SCREEN_CENTER_X - (SCREEN_CENTER_X / 2), SCREEN_CENTER_Y + (SCREEN_CENTER_Y / 2));
        this.threadsButton.onclick = function () {
            // https://developers.facebook.com/docs/threads/threads-web-intents/
            // web intentでのハッシュタグの扱いが環境（ブラウザ、iOS、Android）によって違いすぎるので『#』を削って通常の文字列にしておく
            let shareURL = "https://www.threads.net/intent/post?text=" + encodeURIComponent(postText + "\n\n" + postTags.replace(/#/g, "")) + "&url=" + encodeURIComponent(postURL);
            window.open(shareURL);
        };
        this.threadsButton.alpha = 0.0;
        this.threadsButton.sleep();

        // Bluesky
        this.bskyButton = Button(
            {
                text: String.fromCharCode(0xe900),
                fontSize: 32,
                fontFamily: "icomoon",
                fill: "#7575EF",  // ボタン色
                stroke: '#DEE3FF',         // 枠色
                strokeWidth: 5,         // 枠太さ
                cornerRadius: 8,
                width: 64,
                height: 64,
            }
        ).addChildTo(group5).setPosition(SCREEN_CENTER_X - (SCREEN_CENTER_X / 2) + 80, SCREEN_CENTER_Y + (SCREEN_CENTER_Y / 2));
        this.bskyButton.onclick = function () {
            // https://docs.bsky.app/docs/advanced-guides/intent-links
            let shareURL = "https://bsky.app/intent/compose?text=" + encodeURIComponent(postText + "\n" + postTags + "\n" + postURL);
            window.open(shareURL);
        };
        this.bskyButton.alpha = 0.0;
        this.bskyButton.sleep();

        // RESTARTボタンの表示
        this.restartButton = Button(
            {
                text: "RESTART",
                fontSize: 20,
                fontFamily: FONT_FAMILY,
                align: "center",
                baseline: "middle",
                width: 150,
                height: 75,
                fill: "#B2B2B2",
                stroke: '#DEE3FF',         // 枠色
                strokeWidth: 5,         // 枠太さ
            }
        ).addChildTo(group5).setPosition(SCREEN_CENTER_X + (SCREEN_CENTER_X / 2), SCREEN_CENTER_Y + (SCREEN_CENTER_Y / 2));
        this.restartButton.onpush = function () {
            that.exit();
        };
        this.restartButton.alpha = 0.0;
        this.restartButton.sleep();

        gameOverLabel = Label(
            {
                text: "GAME OVER",
                fontSize: 64,
                fontFamily: FONT_FAMILY,
                align: "center",

                fill: "white",
                stroke: "black",
                strokeWidth: 4,
                shadow: "black",
                shadowBlur: 40,
            }
        ).addChildTo(group5).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y - 96);
        // 最大コンボ
        Label({
            text: 'Max Combo: ' + this.maxCombo,
            fontSize: 30,
            fontFamily: FONT_FAMILY,
            align: "center",
            fill: 'white',
            stroke: "black",
            strokeWidth: 4,
            shadow: "black",
            shadowBlur: 40,
        }).addChildTo(group5).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y + 48);

        // パーティー回数
        Label({
            text: 'Party Count: ' + this.partyCount,
            fontSize: 30,
            fontFamily: FONT_FAMILY,
            align: "center",
            fill: 'white',
            stroke: "black",
            strokeWidth: 4,
            shadow: "black",
            shadowBlur: 40,
        }).addChildTo(group5).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y + 128);


        // チェーンをクリア
        this.chain.forEach((hema) => {
            hema.unhighlight();
        });
        this.chain = [];

        // パーティー終了
        if (this.isParty) {
            this.exitParty();
        }

        SoundManager.play("gameover");
    },

    gameOver: function () {
        if (this.xButton.alpha < 1.0) {
            this.xButton.alpha += 1 / 60;
            this.threadsButton.alpha += 1 / 60;
            this.bskyButton.alpha += 1 / 60;
            this.restartButton.alpha += 1 / 60;
            if (this.xButton.alpha >= 1.0) {
                this.xButton.alpha = 1.0;
                this.threadsButton.alpha = 1.0;
                this.bskyButton.alpha = 1.0;
                this.restartButton.alpha = 1.0;
                this.xButton.wakeUp();
                this.threadsButton.wakeUp();
                this.bskyButton.wakeUp();
                this.restartButton.wakeUp();
            }
        }
    },

    update: function () {
        if (world) {
            // ゲームオーバー時は物理演算を停止
            if (!this.isGameOver) {
                // Box2Dワールドの更新
                world.Step(1 / 60, 6, 2);
            }

            // ヘマの位置を更新
            hemaObjects.forEach((hema) => {
                hema.updateFromBody();
            });

            // ボムの位置を更新
            bombObjects.forEach((bomb) => {
                bomb.updateFromBody();
            });

            // タイマー更新
            this.updateTimer();

            // コンボタイマー
            this.updateComboTimer();
            // パーティーゲージ更新
            this.updatePartyGauge();

            // デバッグ
            //this.drawDebug();
        }
    },

    drawDebug: function () {
        const Box2D = this.Box2D;

        // 既存のデバッグ描画をクリア
        if (this.debugLayer) {
            this.debugLayer.remove();
        }

        // デバッグレイヤーを作成
        this.debugLayer = DisplayElement().addChildTo(this);

        // すべてのボディを取得して描画
        let body = world.GetBodyList();
        while (Box2D.getPointer(body)) {
            const pos = body.GetPosition();
            const angle = body.GetAngle();

            // フィクスチャを取得
            let fixture = body.GetFixtureList();
            while (Box2D.getPointer(fixture)) {
                const shape = fixture.GetShape();
                const shapeType = shape.GetType();

                // 円形の場合
                if (shapeType === Box2D.b2Shape.e_circle) {
                    const radius = shape.get_m_radius();
                    const circle = CircleShape({
                        radius: radius * 30,
                        fill: null,
                        stroke: 'red',
                        strokeWidth: 2,
                    }).addChildTo(this.debugLayer);
                    circle.x = pos.x * 30;
                    circle.y = pos.y * 30;
                }
                // ポリゴン（矩形）の場合
                else if (shapeType === Box2D.b2Shape.e_polygon) {
                    const polygonShape = Box2D.castObject(shape, Box2D.b2PolygonShape);
                    const vertices = [];

                    for (let i = 0; i < polygonShape.get_m_count(); i++) {
                        const v = polygonShape.get_m_vertices(i);
                        const vx = v.x * 30;
                        const vy = v.y * 30;

                        // 回転を適用
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);
                        const rotatedX = vx * cos - vy * sin;
                        const rotatedY = vx * sin + vy * cos;

                        vertices.push({
                            x: pos.x * 30 + rotatedX,
                            y: pos.y * 30 + rotatedY
                        });
                    }

                    // 頂点を線で結ぶ
                    for (let i = 0; i < vertices.length; i++) {
                        const v1 = vertices[i];
                        const v2 = vertices[(i + 1) % vertices.length];

                        const line = RectangleShape({
                            width: Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)),
                            height: 2,
                            fill: 'lime',
                            stroke: null,
                        }).addChildTo(this.debugLayer);

                        line.x = (v1.x + v2.x) / 2;
                        line.y = (v1.y + v2.y) / 2;
                        line.rotation = Math.atan2(v2.y - v1.y, v2.x - v1.x) * (180 / Math.PI);
                    }
                }

                fixture = fixture.GetNext();
            }

            body = body.GetNext();
        }
    },
});
// アプリケーション起動
phina.main(function () {
    var app = GameApp({
        startLabel: 'init',
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        assets: ASSETS,
        backgroundColor: '#000000',
        scenes: [
            {
                label: 'init',
                className: 'InitScene',
                nextLabel: 'title',
            },

            {
                label: 'title',
                className: 'TitleScene',
                nextLabel: 'main',
            },
            {
                label: 'main',
                className: 'MainScene',
                nextLabel: 'main',
            }
        ]
    });

    app.run();
});

function myRandom(n, m) {
    // 小数が渡された場合に備えて整数に変換
    const min = Math.ceil(n);
    const max = Math.floor(m);

    // Math.random() は 0以上1未満の浮動小数点を返す
    return Math.floor(Math.random() * (max - min + 1)) + min;
}