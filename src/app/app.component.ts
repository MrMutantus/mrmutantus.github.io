import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title : string = 'MrMutantus';
  opened = true;
  toggleSidenav() {
    this.opened = !this.opened;
  }
}
