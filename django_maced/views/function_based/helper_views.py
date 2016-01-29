import inspect
import json

from django.core.exceptions import ObjectDoesNotExist
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
    if "item_model" in kwargs:
        item_model = kwargs["item_model"]

        # This should really be checking if it is a model, not a class.
        if not inspect.isclass(item_model):
            return HttpResponse(content="item_model was not a class.", status=500)
    else:
        return HttpResponse(content="item_model was not in the kwargs.", status=500)

    # Get any select_object_models_info
    if "select_object_models_info" in kwargs:
        select_object_models_info = kwargs["select_object_models_info"]

        if isinstance(select_object_models_info, list):
            count = 0

            for select_object_model_info in select_object_models_info:
                if isinstance(select_object_model_info, tuple):
                    if len(select_object_model_info) == 2:
                        if isinstance(select_object_model_info[0], (str, unicode)):
                            # This should really be checking if it is a model, not a class.
                            if not inspect.isclass(select_object_model_info[1]):
                                return HttpResponse(
                                    content="Select object model number " + str(count) +
                                            "'s tuple's model is not a class.",
                                    status=500
                                )
                        else:
                            return HttpResponse(
                                content="Select object model number " + str(count) +
                                        "'s tuple's field name is not a string.",
                                status=500
                            )
                    else:
                        return HttpResponse(
                            content="Select object model number " + str(count) + " is a tuple of size " +
                                    str(len(select_object_model_info)) + " but should be size of 2. (field_name, class).",
                            status=500
                        )
                else:
                    return HttpResponse(
                        content="Select object model number " + str(count) + " is not a tuple.",
                        status=500
                    )

                count += 1
        else:
            return HttpResponse(content="select_object_models must be a list.", status=500)
    else:
        select_object_models_info = None

    return (data, item_name_field_name, item_model, select_object_models_info)


def get_fields_and_item_name_from_post_view(request, item_model, item_name_field_name):
    # Get all fields on the model
    fields = item_model._meta.fields

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


# It is assumed that select_object_models_info has been validated by this point.
# Should have been done in authenticate_and_validate_kwargs_view().
def convert_foreign_keys_to_objects(fields_to_save, select_object_models_info):
    if select_object_models_info is None:
        return True  # True just means it succeeded (there was nothing to do).

    for select_object_model_info in select_object_models_info.iteritems():
        field_name1 = select_object_model_info[0]

        for field_name2, field_value in fields_to_save.iteritems():
            if field_name2 == field_name1:
                try:
                    fields_to_save[field_name2] = select_object_model_info[1].objects.get(id=field_value)
                except ObjectDoesNotExist:
                    return HttpResponse(
                        content="Tried to load id " + field_value + " on model named " +
                                select_object_model_info[1].__class__.__name__ + " to be used with field named " +
                                field_name2 + ".",
                        status=500
                    )
                break
        else:
            return HttpResponse(
                content="Could not find field name of " + field_name1 + " associated with the model named " +
                        select_object_model_info.__class__.__name__ + " in fields_to_save. Check for typos in kwargs " +
                        "and item_names. ",
                status=500
            )

    return True  # True just means it succeeded.