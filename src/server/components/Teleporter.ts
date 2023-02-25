import { Component, BaseComponent } from "@flamework/components";
import { ACTIVATION_COLOR } from "server/config";
import { Touchable } from "./base/Touchable";

const tag = "Teleporter";

const TweenService = game.GetService("TweenService");

const EFFECT_DURATION = 5;

interface Attributes {}

interface TeleporterInstance extends Model {
	In: Model & {
		TouchPart: Part & {
			Attachment: Attachment & {
				ParticleEmitter: ParticleEmitter;
			};
			SurfaceLight: SurfaceLight;
			Electricity: Sound;
			Shock: Sound;
		};
	};
	Out: Model & {
		TouchPart: Part & {
			Attachment: Attachment & {
				ParticleEmitter: ParticleEmitter;
			};
			SurfaceLight: SurfaceLight;
			Electricity: Sound;
			Shock: Sound;
		};
	};
}

@Component({
	tag,
})
export class Teleporter extends BaseComponent<Attributes, TeleporterInstance> {
	private touchableIn: Touchable;

	constructor() {
		super();

		const inTouchPart = this.instance.In.TouchPart;
		this.touchableIn = new Touchable(inTouchPart, {
			onTouch: (character) => this.onTouch(character),
		});
	}

	private onTouch(character: Model) {
		this.touchableIn.setCanTouch(false);

		this.activateEffects();
		this.teleportCharacter(character);

		this.touchableIn.setCanTouch(true);
	}

	private activateEffects() {
		const touchPartIn = this.instance.In.TouchPart;
		const surfaceLightIn = touchPartIn.SurfaceLight;
		const particleEmitterIn = touchPartIn.Attachment.ParticleEmitter;

		const originalColor = touchPartIn.Color;
		const originalRate = particleEmitterIn.Rate;
		const originalBrightness = surfaceLightIn.Brightness;

		const tweenInfo = new TweenInfo(EFFECT_DURATION / 2);
		const tweenTouchPart = TweenService.Create(touchPartIn, tweenInfo, {
			Color: ACTIVATION_COLOR,
		});
		const tweenSurfaceLight = TweenService.Create(surfaceLightIn, tweenInfo, {
			Brightness: 10,
			Color: ACTIVATION_COLOR,
		});

		tweenTouchPart.Play();
		tweenSurfaceLight.Play();
		particleEmitterIn.Rate = 0;

		tweenTouchPart.Completed.Connect(() => {
			const tweenTouchPartReverse = TweenService.Create(touchPartIn, tweenInfo, {
				Color: originalColor,
			});
			tweenTouchPartReverse.Play();
			tweenTouchPartReverse.Completed.Connect(() => {
				particleEmitterIn.Rate = originalRate;
			});
		});
		tweenSurfaceLight.Completed.Connect(() => {
			const tweenSurfaceLightReverse = TweenService.Create(surfaceLightIn, tweenInfo, {
				Brightness: originalBrightness,
				Color: originalColor,
			});
			tweenSurfaceLightReverse.Play();
		});
	}

	private teleportCharacter(body: Model) {
		const electricityIn = this.instance.In.TouchPart.Electricity;
		const shockIn = this.instance.In.TouchPart.Shock;
		const _in = this.instance.In;
		const _out = this.instance.Out;
		const touchPartIn = this.instance.In.TouchPart;
		const touchPartOut = this.instance.Out.TouchPart;

		_in.Parent = body;
		_out.Parent = body;

		const rootPart = body.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
		if (!rootPart) return print(`<${tag}> no root part found for ${body.Name}`);
		const humanoid = body.FindFirstChild("Humanoid") as Humanoid | undefined;
		if (!humanoid) return print(`<${tag}> no humanoid found for ${body.Name}`);

		rootPart.Anchored = true;
		humanoid.PlatformStand = true;

		const tweenTopInfo = new TweenInfo(EFFECT_DURATION * 0.2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut);
		const tweenTop = TweenService.Create(rootPart, tweenTopInfo, {
			CFrame: touchPartIn.CFrame.add(new Vector3(0, 4, 0)),
		});
		tweenTop.Play();
		electricityIn.Play();

		const tweenInInfo = new TweenInfo(EFFECT_DURATION * 0.1, Enum.EasingStyle.Sine, Enum.EasingDirection.In);
		const tweenIn = TweenService.Create(rootPart, tweenInInfo, {
			CFrame: touchPartIn.CFrame.sub(new Vector3(0, 1, 0)),
		});
		tweenTop.Completed.Connect(() => {
			tweenIn.Play();
			this.transparentify(body, 1, ["In", "Out", "HumanoidRootPart"]);
		});

		const tweenOutInfo = new TweenInfo(EFFECT_DURATION * 0.1, Enum.EasingStyle.Sine, Enum.EasingDirection.Out);
		const tweenOut = TweenService.Create(rootPart, tweenOutInfo, {
			CFrame: touchPartOut.CFrame.add(new Vector3(0, 4, 0)),
		});

		const tweenToInfo = new TweenInfo(EFFECT_DURATION * 0.6, Enum.EasingStyle.Sine, Enum.EasingDirection.Out);
		const tweenTo = TweenService.Create(rootPart, tweenToInfo, {
			CFrame: touchPartOut.CFrame.sub(new Vector3(0, 1, 0)),
		});
		tweenIn.Completed.Connect(() => {
			tweenTo.Play();
		});

		tweenTo.Completed.Connect(() => {
			electricityIn.Stop();
			shockIn.Play();

			tweenOut.Play();
			this.transparentify(body, 0, ["In", "Out", "HumanoidRootPart"]);
			tweenOut.Completed.Connect(() => {
				_in.Parent = this.instance;
				_out.Parent = this.instance;

				humanoid.PlatformStand = false;
				rootPart.Anchored = false;
			});
		});
	}

	private transparentify(model: Model | Accessory, transparency: number, blackList: string[]) {
		const tweens = [];
		for (const child of model.GetChildren()) {
			if (blackList.includes(child.Name)) continue;
			if (child.IsA("BasePart") || child.IsA("Decal") || child.IsA("Texture") || child.IsA("MeshPart")) {
				const tweenInfo = new TweenInfo(0.5);
				const tween = TweenService.Create(child, tweenInfo, {
					Transparency: transparency,
				});
				tweens.push(tween);
				// if it's the head, make sure to hide the face
				if (child.Name === "Head") {
					const face = child.FindFirstChild("face") as Decal | undefined;
					if (face) {
						face.Transparency = transparency;
					}
				}
			} else if (child.IsA("Model") || child.IsA("Accessory")) {
				this.transparentify(child, transparency, blackList);
			}
		}
		for (const tween of tweens) {
			tween.Play();
		}
	}
}
