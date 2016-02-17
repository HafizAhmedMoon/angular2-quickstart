/**
 * Created by Raza on 2/17/2016.
 */

import {Component} from 'angular2/core';
import {TimerWrapper} from 'angular2/src/facade/async';

@Component({
    selector: 'my-app',
    template: '<h1>Hello {{name}}</h1>'
})
export class AppComponent {
    name: string = 'World';
    constructor(){
        TimerWrapper.setTimeout(() => this.name = "Angular2" , 3000)
    }
}