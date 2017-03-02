import { Component, Input, ViewChildren, QueryList, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { MenuItemViewModel } from '../view-models/menu-item-view-model';
import { ActionViewModel } from '../view-models/action-view-model'; // needed for declarations compile 
import * as Models from '../models';
import { IAction } from '../action/action.component';
import { ActionComponent} from '../action/action.component';
import { ActionsComponent} from '../actions/actions.component';

@Component({
    selector: 'nof-action-list',
    template: require('./action-list.component.html'),
    styles: [require('./action-list.component.css')]
})
export class ActionListComponent extends ActionsComponent implements OnInit, AfterViewInit {

    @Input()
    set actions (mi :{ menuItems: MenuItemViewModel[] }) {
        this.menu = mi;
    }

    @ViewChildren(ActionComponent)
    actionChildren: QueryList<ActionComponent>;

    ngOnInit(): void {
        this.firstAction = this.findFirstAction(this.items);
    }

    ngAfterViewInit(): void {
        this.focusOnFirstAction(this.actionChildren);
        this.actionChildren.changes.subscribe((ql: QueryList<ActionComponent>) => this.focusOnFirstAction(ql));
    }
}