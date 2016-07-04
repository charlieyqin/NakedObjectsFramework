/// <reference path="typings/lodash/lodash.d.ts" />


module NakedObjects {
    app.run((template: ITemplate) => {
        template.setTemplateName("AdventureWorksModel.Location", TemplateType.Object, InteractionMode.View, "Content/customTemplates/locationView.html");
        template.setTemplateName("AdventureWorksModel.WorkOrderRouting", TemplateType.Object, InteractionMode.Edit, "Content/customTemplates/workOrderRoutingEdit.html");
        template.setTemplateName("AdventureWorksModel.Location", TemplateType.List, CollectionViewState.List, "Content/customTemplates/locationList.html");
    });
}