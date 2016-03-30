/**
 * Created by Raza on 2/17/2016.
 */

import {Component} from "angular2/core";

@Component({
  selector: 'first',
  templateUrl: './firstComponent.html'
})
export class FirstComponent {
  name:string = 'Child Component';
}
