/**
 * Created by Raza on 2/17/2016.
 */

import {Component, View} from "angular2/core";
import {TimerWrapper} from "angular2/src/facade/async";
import {FirstComponent} from "./myComponent/firstComponent";

@Component({
  selector: 'app',
  template: '<div><h1>Hello {{name}}</h1><first></first></div>',
  directives: [FirstComponent]
})
export class AppComponent {
  name:string = 'World';

  constructor() {
    TimerWrapper.setTimeout(() => {
      this.name = "Angular2"
    }, 3000)
  }
}

