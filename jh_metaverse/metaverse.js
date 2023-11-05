import * as THREE from '../build/three.module.js';
// 마우스를 이용해 Object를 회전시키기 위한 코드
import { OrbitControls } from "../examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "../examples/jsm/loaders/GLTFLoader.js"
import Stats from "../examples/jsm/libs/stats.module.js";
//충돌검사를 위한 모듈import
//Octree : 3차원 공간 분할
import { Octree } from "../examples/jsm/math/Octree.js"
import { Capsule } from "../examples/jsm/math/Capsule.js"

// three.js의 구성

// 1. Renderer : Scene을 모니터에 렌더링(출력)할 수 있는 장치

// 1-1. Scene : 3차원 객체로 구성되는 장면

// 1-1-1. Light : 3차원 형상을 화면에 표시하기위한 광원
// 1-1-2. Mesh (Object3D) : Object3D의 파생 클래스

// 1-1-2-1. Geometry : 형상을 정의
// 1-1-2-2. Material : 색상 및 투명도 정의

// 1-2. Camera : Scene을 어떤 지점에서 볼지를 정하는 장치
class App {
     // 약속
    // 1. "_"이 앞에 붙은 메서드는 이 App클래스 내부에서만 사용되는 private라는 뜻
    constructor() {
        // html에서 3D를 띄워줄 div 선언하기
        const divContainer = document.querySelector("#webgl-container");
        // 다른 메서드에서 참조할 수 있도록 field로 정의
        this._divContainer = divContainer;

        // Renderer 생성 (antialias : 렌더링 시 물체의 경계선을 부드럽게 표시)
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        // pixel의 ratio값 설정
        renderer.setPixelRatio(window.devicePixelRatio);
        // renderer의 domElement를 id가 webgl-container인 div의 자식으로 추가
        divContainer.appendChild(renderer.domElement);
        // 다른 메서드에서 참조할 수 있도록 field로 정의

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.VSMShadowMap;

        this._renderer = renderer; // 이 renderer는 canvas타입의 dom 객체

        // scene객체 생성
        const scene = new THREE.Scene();
        this._scene = scene;

        // 배경색
        // scene.background = new THREE.Color(0xffffff);

        // this._setupOctree();
        this._setupCamera();
        this._setupLight();
        this._setupModel();
        this._setupControls();

        // window.onresize : 창 크기 변경시 발동되는 장치
        // renderer와 camera는 창 크기가 변경될 때마다 그 크기에 맞게 속성값을 재설정 해줘야 하기 때문
        // bind : resize method안에서 this가 가르키는 객체가 이벤트 객체가 아닌 이 App
        //          클래스의 객체가 되도록하기 위해 사용
        window.onresize = this.resize.bind(this);
        this.resize();

        // render : 3차원 그래픽 장면을 만들어주는 메서드
        // render메서드를 requestAnimationFrame에 넘겨줌으로써 render메서드 호출
        // bind를 사용한 이유 : render메서드의 코드안에서 사용되는 this가 바로 이
        //                      app클래스의 객체를 가르키기 위해
        requestAnimationFrame(this.render.bind(this));
    }

    _setupOctree(model) {
        this._worldOctree = new Octree();
        this._worldOctree.fromGraphNode(model);
    }

    _setupControls() {
        // OrbitControls : 마우스로 화면을 컨트롤하는 기능
        // OrbitControls객체 = 카메라 객체 + 마우스 이벤트를 받는 Dom요소        
        this._controls = new OrbitControls(this._camera, this._divContainer);
        this._controls.target.set(0, 100, 0);
        /* OrbitControls의 shift누른상태로 드래그? -> 화면이동
            그래서 화면 떨림이 생기므로 화면이동기능을 막음
            마우스 기능을 막아버렸기때문에 소스코드 변경필요 (상단import로!)
            switch ( mouseAction )의 case MOUSE.ROTATE:를 수정하고 옴 */        
        this._controls.enablePan = false;
        this._controls.enableDamping = true; // 마우스 화면회전 부드럽게

        // 초당 렌더링 fps확인
        const stats = new Stats();
        this._divContainer.appendChild(stats.dom);
        this._fps = stats; 
        
        // 어떤키가 눌렸는지 확인
        this._pressedKeys = {};

        document.addEventListener("keydown", (event) => {
            this._pressedKeys[event.key.toLowerCase()] = true;
            this._processAnimation();
        });

        document.addEventListener("keyup", (event) => {
            this._pressedKeys[event.key.toLowerCase()] = false;
            this._processAnimation();
        });
    }
    
    _processAnimation() {
        const previousAnimationAction = this._currentAnimationAction;

        if(this._pressedKeys["w"] || this._pressedKeys["a"] || this._pressedKeys["s"] || this._pressedKeys["d"]) {
            if(this._pressedKeys["shift"]) {
                this._currentAnimationAction = this._animationMap["Run"];
                // this._speed = 350;
                this._maxSpeed = 350;
                this._acceleration = 3;                
            } else {
                this._currentAnimationAction = this._animationMap["Walk"];                
                //this._speed = 80;
                this._maxSpeed = 80;
                this._acceleration = 3;
            }
        } else {
            this._currentAnimationAction = this._animationMap["Idle"];
            this._speed = 0;
            this._maxSpeed = 0;
            this._acceleration = 0;
        }

        if(previousAnimationAction !== this._currentAnimationAction) {
            previousAnimationAction.fadeOut(0.5);
            this._currentAnimationAction.reset().fadeIn(0.5).play();
        }
    }

    _setupModel() {
        // //블렌더 사용전 가상의 plane
        // const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
        // const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x878787 });
        // const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        // plane.rotation.x = -Math.PI/2;
        // this._scene.add(plane);
        // plane.receiveShadow = true;
        // this._worldOctree.fromGraphNode(plane);

        //여러개의 gltf파일을 읽어오기 위한 loader객체
        const loader = new GLTFLoader();

        loader.load("./data/model.glb", (gltf) => {
            const model = gltf.scene;
            this._scene.add(model);

            //모델은 그림자 생성만 함
            model.traverse(child => {
                if(child instanceof THREE.Mesh) {
                    child.castShadow = true;
                }
            });

             //캐릭터가 완전히 로딩된 시점
            const animationClips = gltf.animations; // THREE.AnimationClip[]
            const mixer = new THREE.AnimationMixer(model);
            const animationsMap = {};
            animationClips.forEach(clip => {
                const name = clip.name;
                console.log(name);
                animationsMap[name] = mixer.clipAction(clip); // THREE.AnimationAction
            });

            this._mixer = mixer;
            this._animationMap = animationsMap;
            this._currentAnimationAction = this._animationMap["Idle"];
            this._currentAnimationAction.play();

            const box = (new THREE.Box3).setFromObject(model);
            model.position.y = (box.max.y - box.min.y) / 2;

            const height = (box.max.y - box.min.y);
            const diameter = box.max.z - box.min.z;

            //캡슐
            model._capsule = new Capsule(// start,end,radius
                new THREE.Vector3(0, diameter/2, 0), 
                new THREE.Vector3(0, height - diameter/2, 0), 
                diameter/2
            );          

            //월드 좌표계 축 표시 x 빨강 y초록 z파랑
            const axisHelper = new THREE.AxesHelper(1000);
            this._scene.add(axisHelper);

            const boxHelper = new THREE.BoxHelper(model);
            this._scene.add(boxHelper);          
            this._boxHelper = boxHelper;
            this._model = model;  

            // // 블렌더 사용전 장애물
            // const boxG = new THREE.BoxGeometry(100, diameter-5, 100);
            // const boxM = new THREE.Mesh(boxG, planeMaterial);
            // boxM.receiveShadow = true;
            // boxM.castShadow = true;
            // boxM.position.set(250, 0, 0);
            // this._scene.add(boxM);    
            
            // this._worldOctree.fromGraphNode(boxM);
        });
        loader.load("./data/space4.glb", (gltf) => {
            const model = gltf.scene;
            this._scene.add(model);

            
            model.traverse(child => {
                if(child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }

            });

            this._setupOctree(model);

    });
    }

    _setupCamera() {        
        // three.js가 3차원 그래픽을 출력할 영역의 가로, 세로 크기를 가져오기
        const width = this._divContainer.clientWidth;
        const height = this._divContainer.clientHeight;
        // 카메라 객체 생성
        const camera = new THREE.PerspectiveCamera(
            60, 
            window.innerWidth / window.innerHeight, 
            1, 
            5000
        );

        camera.position.set(0, 100, 500);
        this._camera = camera;
    }

    _addPointLight(x, y, z, helperColor) {
        const color = 0xffffff;
        const intensity = 1.5;
    
        const pointLight = new THREE.PointLight(color, intensity, 2500);
        pointLight.position.set(x, y, z);
    
        this._scene.add(pointLight);
    
        const pointLightHelper = new THREE.PointLightHelper(pointLight, 10, helperColor);
        this._scene.add(pointLightHelper);
    }

    // 빛
    _setupLight() {
        //주변광
        const ambientLight = new THREE.AmbientLight(0xffffff, .5);
        this._scene.add(ambientLight);

        // 4개의 포인트 라이트
        this._addPointLight(700, 100, 700, 0xff0000);
        this._addPointLight(-700, 100, 700, 0xffff00);
        this._addPointLight(-700, 100, -700, 0x00ff00);
        this._addPointLight(700, 100, -700, 0x0000ff);

        // 그림자
        const shadowLight = new THREE.DirectionalLight(0xffffff, 0.2);
        shadowLight.position.set(200, 500, 200);
        shadowLight.target.position.set(0, 0, 0);

        //라이트 위치 볼수있게 해줌
        const directionalLightHelper = new THREE.DirectionalLightHelper(shadowLight, 10);
        this._scene.add(directionalLightHelper);
        
        this._scene.add(shadowLight);
        this._scene.add(shadowLight.target);

        //그림자 광원처리
        shadowLight.castShadow = true;
        shadowLight.shadow.mapSize.width = 1024;
        shadowLight.shadow.mapSize.height = 1024;
        shadowLight.shadow.camera.top = shadowLight.shadow.camera.right = 700;
        shadowLight.shadow.camera.bottom = shadowLight.shadow.camera.left = -700;
        shadowLight.shadow.camera.near = 100;
        shadowLight.shadow.camera.far = 900;
        shadowLight.shadow.radius = 5;

        //그림자가 표시되려면 주황색 정육면체 안에 mesh가 모두 포함되어야함
        const shadowCameraHelper = new THREE.CameraHelper(shadowLight.shadow.camera);
        this._scene.add(shadowCameraHelper);
    }    

    _previousDirectionOffset = 0;

    _directionOffset() {
        const pressedKeys = this._pressedKeys;
        let directionOffset = 0 // w키 기준

        if (pressedKeys['w']) {
            if (pressedKeys['a']) {
                directionOffset = Math.PI / 4 // w+a (45도)
            } else if (pressedKeys['d']) {
                directionOffset = - Math.PI / 4 // w+d (-45도)
            }
        } else if (pressedKeys['s']) {
            if (pressedKeys['a']) {
                directionOffset = Math.PI / 4 + Math.PI / 2 // s+a (135도)
            } else if (pressedKeys['d']) {
                directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d (-135도)
            } else {
                directionOffset = Math.PI // s (180도)
            }
        } else if (pressedKeys['a']) {
            directionOffset = Math.PI / 2 // a (90도)
        } else if (pressedKeys['d']) {
            directionOffset = - Math.PI / 2 // d (-90도)
        } else {
            directionOffset = this._previousDirectionOffset;
        }
         // 키보드에서 손을 뗐을때 캐릭터가 바라보는 방향 유지
        this._previousDirectionOffset = directionOffset;

        return directionOffset;        
    }

    _speed = 0;
    _maxSpeed = 0;
    _acceleration = 0;

    // 바닥 위에 있는가?
    _bOnTheGround = false;
    _fallingAcceleration = 0;
    _fallingSpeed = 0;  

    update(time) {
        time *= 0.001; // 알아보기 쉽게 ms단위를 초단위로 변경

        this._controls.update();
        //박스
        if(this._boxHelper) {
            this._boxHelper.update();
        }

        this._fps.update();

        //애니메이션 믹서가 유효한지
        if(this._mixer) {
            // deltaTime : 현재 업데이트 된 메서드가 직전 업데이트된 메서드로부터 얼마만큼의 시간이 소요되는지
            const deltaTime = time - this._previousTime;
            this._mixer.update(deltaTime);

            // 모델이 바라보는방향 == 카메라가 보는방향으로 만들기위한 보정 값 구하기
            const angleCameraDirectionAxisY = Math.atan2(
                (this._camera.position.x - this._model.position.x),
                (this._camera.position.z - this._model.position.z)
            ) + Math.PI;

            // angleCameraDirectionAxisY의 각도만큼 회전
            const rotateQuarternion = new THREE.Quaternion();
            rotateQuarternion.setFromAxisAngle(
                new THREE.Vector3(0,1,0), 
                angleCameraDirectionAxisY + this._directionOffset()
            );
            
            // 실제 모델 회전
            // rotateTowards가 호출될 때마다 rotateQuarternion객체를 이용해 5도만큼 모델 회전(단계적회전)
            this._model.quaternion.rotateTowards(rotateQuarternion, THREE.MathUtils.degToRad(5));            
            
            //이동방향 기준 = 카메라가 바라보는 방향
            const walkDirection = new THREE.Vector3();
            this._camera.getWorldDirection(walkDirection);

            //수직이동하지않고 x,z 평면에서만!
            //walkDirection.y = 0;
            walkDirection.y = this._bOnTheGround ? 0 : -1;
            walkDirection.normalize();

            //키보드에 대해 입력한 방향값 만큼 회전시켜준다
            walkDirection.applyAxisAngle(new THREE.Vector3(0,1,0), this._directionOffset());

            // 애니메이션 스피드 조절
            if(this._speed < this._maxSpeed) this._speed += this._acceleration;
            else this._speed -= this._acceleration*2;

            // 허공에 떠있을때 떨어지는 속도 조절
            if(!this._bOnTheGround) {
                this._fallingAcceleration += 1;
                this._fallingSpeed += Math.pow(this._fallingAcceleration, 2);
            } else {
                this._fallingAcceleration = 0;
                this._fallingSpeed = 0;
            }

            //walkDirection과 _Speed를 이용해 떨어지는 속도벡터 구함
            const velocity = new THREE.Vector3(
                walkDirection.x * this._speed, 
                walkDirection.y * this._fallingSpeed, 
                walkDirection.z * this._speed
            );

            //얼마나 떨어져야함?
            const deltaPosition = velocity.clone().multiplyScalar(deltaTime);

            // const moveX = walkDirection.x * (this._speed * deltaTime);
            // const moveZ = walkDirection.z * (this._speed * deltaTime);

            // this._model.position.x += moveX;
            // this._model.position.z += moveZ;    

            //캡슐이동 후 모델을 맞춤
            this._model._capsule.translate(deltaPosition);

            //충돌시 result에 normal과 depth 값이 담김
                //depth : 캡슐이 장애물을 얼마나 깊이 침범했는지의 길이
                //normal : 충돌한 장애물 표면의 수직방향의 단위벡터
            const result = this._worldOctree.capsuleIntersect(this._model._capsule);
            if(result) { // 충돌
                this._model._capsule.translate(result.normal.multiplyScalar(result.depth));
                this._bOnTheGround = true; 
            } else {
                this._bOnTheGround = false;
            }

            const previousPosition = this._model.position.clone();
            const capsuleHeight =  this._model._capsule.end.y - this._model._capsule.start.y 
                + this._model._capsule.radius*2;
            
            //카메라의 타겟을 캐릭터위치로 지정
            this._model.position.set(
                this._model._capsule.start.x, 
                this._model._capsule.start.y - this._model._capsule.radius + capsuleHeight/2, 
                this._model._capsule.start.z
            );             

            //캐릭터 이동시 항상 정면의 중심에 위치하게 = 카메라의 추적필요
            // this._camera.position.x += moveX;
            // this._camera.position.z += moveZ;
            this._camera.position.x -= previousPosition.x - this._model.position.x;
            this._camera.position.z -= previousPosition.z - this._model.position.z;            
            
            this._controls.target.set(
                this._model.position.x,
                this._model.position.y,
                this._model.position.z,
            );
            
        }
        this._previousTime = time;
    }

    // time : 렌더링이 처음 시작된 이후 경과된 시간(ms 단위)
    // time은 requestAnimationFrame 함수가 render함수에 전달해준 값이다
    render(time) {
        // 랜더링 시에 scene을 카메라의 시점으로 렌더링하도록 만드는 장치
        this._renderer.render(this._scene, this._camera);   
         // 속성값을 변경시켜 애니메이션 효과를 만드는 장치
        this.update(time);

        requestAnimationFrame(this.render.bind(this));
    }

    // 창의 크기가 변경될때 발생하는 이벤트
    resize() {
        // 위에서 divContainer로 정의한(#webgl-container div) div의 크기 얻어오기
        const width = this._divContainer.clientWidth;
        const height = this._divContainer.clientHeight;

        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        
        this._renderer.setSize(width, height);
    }
}

window.onload = function () {
    new App();
}