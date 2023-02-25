import { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";

const Players = game.GetService("Players");

type TouchableEvents = {
	onTouch: (character: Model) => void;
	onTouchEnded?: (character: Model) => void;
};

/**
 * Touchable instantiates **player** touch events with a given part
 *
 * Debounce logic is managed internally, only **1 player** may touch
 * at any given moment.
 */
export class Touchable {
	private canTouch = true;
	private touchingCharacter?: Model;
	private touchConnection?: RBXScriptConnection;
	public readonly events: TouchableEvents;

	/**
	 * Handles setup for Touchable
	 * - Initializes this.events
	 * - Attaches onTouch to Touched event
	 * - Attaches onTouchEnded to TouchEnded event
	 * - Attaches cleanUp to Destroying event
	 */
	constructor(touchPart: BasePart, eventHandlers: TouchableEvents) {
		this.events = eventHandlers;

		// Touched connection (locks activation)
		this.touchConnection = touchPart.Touched.Connect((hit) => this.onTouch(hit));

		// TouchEnded connection (unlocks activation)
		this.touchConnection = touchPart.Touched.Connect((hit) => this.onTouchEnded(hit));

		// Destorying connection (clean up)
		touchPart.Destroying.Connect(() => this.cleanUp());
	}

	getCanTouch() {
		return this.canTouch;
	}

	setCanTouch(value: boolean) {
		this.canTouch = value;
	}

	getTouchingCharacter() {
		return this.touchingCharacter;
	}

	/**
	 * Handles touch event
	 */
	private onTouch(hit: BasePart) {
		if (!this.canTouch) return;
		if (this.touchingCharacter !== undefined) return;

		const character = hit.Parent as Model | undefined;
		if (!character) return;
		const isHumanoid = !!character.FindFirstChildOfClass("Humanoid");
		if (!isHumanoid) return;
		const isPlayer = !!Players.GetPlayerFromCharacter(character);
		if (!isPlayer) return;

		// Lock onTouch activation
		this.touchingCharacter = character;

		// Fire external on touch event
		this.events.onTouch(character);
	}

	/**
	 * Handles touch ended event
	 */
	private onTouchEnded(hit: BasePart) {
		if (this.touchingCharacter === undefined) return;
		const character = hit.Parent;
		if (!character) return;

		// If touch ended event is fired for a different player, do nothing
		if (character !== this.touchingCharacter) return;

		// Fire external on touch ended event
		this.events.onTouchEnded && this.events.onTouchEnded(this.touchingCharacter);

		// Unlock onTouch activation
		this.touchingCharacter = undefined;
	}

	/**
	 * Hanldes memory leak prevention
	 */
	private cleanUp() {
		this.touchConnection?.Disconnect();
		this.touchConnection = undefined;
	}
}
