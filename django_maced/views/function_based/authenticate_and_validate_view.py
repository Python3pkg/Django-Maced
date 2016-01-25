import inspect
import json

from django.http import HttpResponse
from django_maced.utils.misc import MissingFromPost, is_item_name_valid, \
    get_bad_item_name_characters_in_string


def authenticate_and_validate_kwargs_view(request, **kwargs):
    data = {}

    if "need_authentication" in kwargs:
        need_authentication = kwargs["need_authentication"]

        if not isinstance(need_authentication, bool):
            return HttpResponse(content="need_authentication must be a bool", status=500)
    else:
        need_authentication = True

    if request.user.is_authenticated() or not need_authentication:
        data["authenticated"] = True
    else:
        data["authenticated"] = False

        return HttpResponse(content=json.dumps(data))

    if "item_name_field_name" in kwargs:
        item_name_field_name = kwargs["item_name_field_name"]
    else:
        item_name_field_name = "name"

    # Get the item class
    if "item_class" in kwargs:
        item_class = kwargs["item_class"]

        # This should really be checking if it is a model, not a class.
        if not inspect.isclass(item_class):
            return HttpResponse(content="item_class was not a class.", status=500)
    else:
        return HttpResponse(content="item_class was not in the kwargs.", status=500)

    return (data, item_name_field_name, item_class)


def get_fields_and_item_name_from_post_view(request, item_class, item_name_field_name):
    # Get all fields on the model
    fields = item_class._meta.fields

    fields_to_save = {}
    missing_field_names = []

    # Build a list of potential fields to fill in
    for field in fields:
        fields_to_save[field.name] = request.POST.get(field.name, MissingFromPost())

        if fields_to_save[field.name].__class__ is MissingFromPost:
            missing_field_names.append(field.name)
            fields_to_save.pop(field.name, None)

    item_name = fields_to_save[item_name_field_name]

    if item_name.__class__ is MissingFromPost:
        return HttpResponse(content=str(item_name_field_name) + " was not in the post but is set as the name field for this object", status=500)

    if item_name == "":
        return HttpResponse(content=str(item_name_field_name) + " is required.", status=500)
    elif not is_item_name_valid(item_name):
        return HttpResponse(content=str(item_name_field_name) + " name must not contain " + get_bad_item_name_characters_in_string(), status=500)

    return (fields_to_save, item_name)