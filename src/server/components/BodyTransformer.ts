import { Component, BaseComponent } from "@flamework/components";
import { ACTIVATION_COLOR } from "server/config";
import { Touchable } from "./base/Touchable";

const tag = "BodyTransformer";

const TweenService = game.GetService("TweenService");

const EFFECT_DURATION = 5;

interface Attributes {}

interface BodyTransformerInstance extends Model {
	TouchPart: Part & {
		Attachment: Attachment & {
			ParticleEmitter: ParticleEmitter;
		};
		SurfaceLight: SurfaceLight;
		Electricity: Sound;
		Shock: Sound;
	};
}

@Component({
	tag,
})
export class BodyTransformer extends BaseComponent<Attributes, BodyTransformerInstance> {
	private playerDebounce = new Set<string>();
	private touchable: Touchable;

	constructor() {
		super();

		const touchPart = this.instance.TouchPart;
		this.touchable = new Touchable(touchPart, {
			onTouch: (character) => this.onTouch(character),
		});
	}

	private onTouch(character: Model) {
		if (this.playerDebounce.has(character.Name)) return;
		// this.playerDebounce.add(character.Name); //!debug uncomment this to prevent multiple transformations
		this.touchable.setCanTouch(false);

		this.activateEffects();
		this.transformBody(character);

		this.touchable.setCanTouch(true);
	}

	private activateEffects() {
		const touchPart = this.instance.TouchPart;
		const surfaceLight = touchPart.SurfaceLight;
		const particleEmitter = touchPart.Attachment.ParticleEmitter;

		const originalColor = touchPart.Color;
		const originalRate = particleEmitter.Rate;
		const originalBrightness = surfaceLight.Brightness;

		const tweenInfo = new TweenInfo(EFFECT_DURATION / 2);
		const tweenTouchPart = TweenService.Create(touchPart, tweenInfo, {
			Color: ACTIVATION_COLOR,
		});
		const tweenSurfaceLight = TweenService.Create(surfaceLight, tweenInfo, {
			Brightness: 10,
			Color: ACTIVATION_COLOR,
		});

		tweenTouchPart.Play();
		tweenSurfaceLight.Play();
		particleEmitter.Rate = 0;

		tweenTouchPart.Completed.Connect(() => {
			const tweenTouchPartReverse = TweenService.Create(touchPart, tweenInfo, {
				Color: originalColor,
			});
			tweenTouchPartReverse.Play();
			tweenTouchPartReverse.Completed.Connect(() => {
				particleEmitter.Rate = originalRate;
			});
		});
		tweenSurfaceLight.Completed.Connect(() => {
			const tweenSurfaceLightReverse = TweenService.Create(surfaceLight, tweenInfo, {
				Brightness: originalBrightness,
				Color: originalColor,
			});
			tweenSurfaceLightReverse.Play();
		});
	}

	private transformBody(body: Model) {
		const electricity = this.instance.TouchPart.Electricity;
		const shock = this.instance.TouchPart.Shock;
		const touchPart = this.instance.TouchPart;
		const rootPart = body.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
		if (!rootPart) return print(`<${tag}> no root part found for ${body.Name}`);
		const humanoid = body.FindFirstChild("Humanoid") as Humanoid | undefined;
		if (!humanoid) return print(`<${tag}> no humanoid found for ${body.Name}`);

		rootPart.Anchored = true;
		humanoid.PlatformStand = true;

		const tweenFrontInfo = new TweenInfo(EFFECT_DURATION * 0.2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut);
		const tweenFront = TweenService.Create(rootPart, tweenFrontInfo, {
			CFrame: touchPart.CFrame.add(touchPart.CFrame.LookVector.mul(5)),
		});
		tweenFront.Play();
		electricity.Play();

		const tweenInInfo = new TweenInfo(EFFECT_DURATION * 0.1, Enum.EasingStyle.Sine, Enum.EasingDirection.In);
		const tweenIn = TweenService.Create(rootPart, tweenInInfo, {
			CFrame: touchPart.CFrame,
		});
		tweenFront.Completed.Connect(() => {
			tweenIn.Play();
		});

		const tweenOutInfo = new TweenInfo(EFFECT_DURATION * 0.1, Enum.EasingStyle.Sine, Enum.EasingDirection.Out);
		const tweenOut = TweenService.Create(rootPart, tweenOutInfo, {
			CFrame: touchPart.CFrame.add(touchPart.CFrame.LookVector.mul(5)),
		});
		tweenIn.Completed.Connect(() => {
			// extra wait for effect
			wait(EFFECT_DURATION * 0.6);
			electricity.Stop();
			shock.Play();

			tweenOut.Play();
			tweenOut.Completed.Connect(() => {
				humanoid.PlatformStand = false;
				rootPart.Anchored = false;
			});
		});
	}
}
