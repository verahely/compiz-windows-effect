'use strict';

const { GLib, Meta } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.commonUtils;

const TIMEOUT_DELAY = 2500;

let grabOpBeginId;
let grabOpEndId;
let resizeMinMaxOpId;
let timeoutWobblyId;

function enable() {
    grabOpBeginId = global.display.connect('grab-op-begin', (display, screen, window, op) => {
        let actor = Utils.get_actor(window);
        if (actor) {
            stop_wobbly_timer();

            Utils.destroy_actor_wobbly_effect(actor);

            if (Utils.is_managed_op(op)) {
                Utils.add_actor_wobbly_effect(actor, op);   
            }
        }
    });

    grabOpEndId = global.display.connect('grab-op-end', (display, screen, window, op) => {  
        if (!Utils.is_managed_op(op)) {
            return;
        }
        
        let actor = Utils.get_actor(window);
        if (actor) {
            timeoutWobblyId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TIMEOUT_DELAY, () => {
                stop_wobbly_timer();

                let actor = Utils.get_actor(window);
                if (actor) {
                    Utils.destroy_actor_wobbly_effect(actor);
                }

                return false;
            });
        }
    });

    resizeMinMaxOpId = global.window_manager.connect('size-change', (e, actor, op) => {
        if (op == 0 && Utils.has_wobbly_effect(actor)) {
            stop_wobbly_timer();

            if (actor) {
                Utils.destroy_actor_wobbly_effect(actor);
            }
        }
    });
}

function disable() {    
    global.display.disconnect(grabOpBeginId);
    global.display.disconnect(grabOpEndId);
    global.display.disconnect(resizeMinMaxOpId);
    
    stop_wobbly_timer();
    
    global.get_window_actors().forEach((actor) => {
        Utils.destroy_actor_wobbly_effect(actor);
    });
}

function stop_wobbly_timer() {
    if (timeoutWobblyId) {
        GLib.source_remove(timeoutWobblyId);
        timeoutWobblyId = 0;
    }
}