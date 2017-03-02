import { Component, Input, ViewChildren, QueryList, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { MenuItemViewModel } from '../view-models/menu-item-view-model';
import { ActionViewModel } from '../view-models/action-view-model'; // needed for declarations compile 
import * as Models from '../models';
import { IAction } from '../action/action.component';
import { ActionComponent} from '../action/action.component';

export abstract class ActionsComponent  {

   
    menu: { menuItems: MenuItemViewModel[] };

    get items() {
        return this.menu.menuItems;
    }

    //private actionButtons : _.Dictionary<IAction[]> = {};

    protected getActionButtons(menuItem: MenuItemViewModel) {
        // todo DRY this clone from ObjectComponent
        //if (!this.actionButtons[menuItem.name]) {
        //const menuItems = this.menuItems() !;
        //const actions = _.flatten(_.map(menuItems, (mi: MenuItemViewModel) => mi.actions!));
        const actions = menuItem.actions;

        // todo investigate caching this 
        return _.map(actions,
            a => ({
                value: a.title,
                doClick: () =>
                    a.doInvoke(),
                doRightClick: () =>
                    a.doInvoke(true),
                show: () => true,
                disabled: () => a.disabled() ? true : null,
                tempDisabled: () => a.tempDisabled(),
                title: () => a.description,
                accesskey: null
            })) as IAction[];
        //}

        //return this.actionButtons[menuItem.name];
    }


    menuName = (menuItem: MenuItemViewModel) => menuItem.name;

    menuItems = (menuItem: MenuItemViewModel) => menuItem.menuItems;

    menuActions = (menuItem: MenuItemViewModel) => menuItem.actions;

    menuButtons = (menuItem: MenuItemViewModel) => this.getActionButtons(menuItem);

    toggleCollapsed = (menuItem: MenuItemViewModel) => menuItem.toggleCollapsed();

    navCollapsed = (menuItem: MenuItemViewModel) => menuItem.navCollapsed;

    displayClass = (menuItem: MenuItemViewModel) => ({ collapsed: menuItem.navCollapsed, open: !menuItem.navCollapsed, rootMenu: !menuItem.name });

    displayContextClass() {
        return ({
            objectContext: this.isObjectContext(),
            collectionContext: this.isCollectionContext(),
            homeContext: this.isHomeContext()
        });
    }

    firstAction: ActionViewModel;

    isObjectContext() {
        return this.firstAction && this.firstAction.actionRep.parent instanceof Models.DomainObjectRepresentation;
    }

    isCollectionContext() {
        return this.firstAction && this.firstAction.actionRep.parent instanceof Models.CollectionMember;
    }

    isHomeContext() {
        return this.firstAction && this.firstAction.actionRep.parent instanceof Models.MenuRepresentation;
    }


    focusOnFirstAction(actions: QueryList<ActionComponent>) {
        if (actions && actions.first) {
            actions.first.focus();
        }
    }

    findFirstAction(menuItems: MenuItemViewModel[]): ActionViewModel | null {
        for (const mi of menuItems) {
            if (mi.actions && mi.actions.length > 0) {
                return mi.actions[0];
            }
            return this.findFirstAction(mi.menuItems);
        }
        return null;
    }

    
}