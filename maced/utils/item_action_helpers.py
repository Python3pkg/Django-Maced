import inspect
import logging

from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse

from maced.utils.constants import GET, MERGE, ADD, EDIT
from maced.utils.misc import MissingFromPost, is_item_name_valid, get_bad_item_name_characters_in_string


logger = logging.getLogger("maced")


def get_and_validate_kwargs(**kwargs):
    if "need_authentication" in kwargs:
        need_authentication = kwargs["need_authentication"]

        if not isinstance(need_authentication, bool):
            message = "need_authentication must be a bool"
            logger.error(message)

            return HttpResponse(content=message, status=500)
    else:
        need_authentication = True

    if "item_name_field_name" in kwargs:
        item_name_field_name = kwargs["item_name_field_name"]
    else:
        item_name_field_name = "name"

    # Get the item class
    if "item_model" in kwargs:
        item_model = kwargs["item_model"]

        # This should really be checking if it is a model, not a class.
        if not inspect.isclass(item_model):
            message = "item_model was not a class."
            logger.error(message)

            return HttpResponse(content=message, status=500)
    else:
        message = "item_model was not in the kwargs."
        logger.error(message)

        return HttpResponse(content=message, status=500)

    # Get any select_object_models_info
    if "select_object_models_info" in kwargs:
        select_object_models_info = kwargs["select_object_models_info"]

        if isinstance(select_object_models_info, list):
            count = 0

            for select_object_model_info in select_object_models_info:
                if isinstance(select_object_model_info, tuple):
                    if len(select_object_model_info) == 2 or len(select_object_model_info) == 3:
                        if isinstance(select_object_model_info[0], (str, unicode)):
                            # This should really be checking if it is a model, not a class.
                            if inspect.isclass(select_object_model_info[1]):
                                if len(select_object_model_info) == 3:
                                    if isinstance(select_object_model_info[2], bool):
                                        if not select_object_model_info[2]:
                                            message = "Select object model number " + str(count) + \
                                                      "'s tuple's inheritance bool must not be False."
                                            logger.error(message)

                                            return HttpResponse(content=message, status=500)
                                    else:
                                        message = "Select object model number " + str(count) + \
                                                  "'s tuple's inheritance bool is not a bool."
                                        logger.error(message)

                                        return HttpResponse(content=message, status=500)
                            else:
                                message = "Select object model number " + str(count) + \
                                          "'s tuple's model is not a class."
                                logger.error(message)

                                return HttpResponse(content=message, status=500)
                        else:
                            message = "Select object model number " + str(count) + \
                                      "'s tuple's field name is not a string."
                            logger.error(message)

                            return HttpResponse(content=message, status=500)
                    else:
                        message = "Select object model number " + str(count) + " is a tuple of size " + \
                                  str(len(select_object_model_info)) + " but should be size of 2 like this " + \
                                  "(field_name, class), or a size of 3 like this " + \
                                  "(pointer_field_name, parent_class, True)"
                        logger.error(message)

                        return HttpResponse(content=message, status=500)
                else:
                    message = "Select object model number " + str(count) + " is not a tuple."
                    logger.error(message)

                    return HttpResponse(content=message, status=500)

                count += 1
        else:
            message = "select_object_models must be a list."
            logger.error(message)

            return HttpResponse(content=message, status=500)
    else:
        select_object_models_info = None

    return need_authentication, item_name_field_name, item_model, select_object_models_info


def get_post_data(request, item_model, item_name_field_name, action_type):
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

    if action_type == MERGE or action_type == ADD or action_type == EDIT:
        item_name = fields_to_save[item_name_field_name]

        if item_name.__class__ is MissingFromPost:
            message = str(item_name_field_name) + " was not in the post but is set as the name field for this object"
            logger.error(message)

            return HttpResponse(content=message, status=500)

        if item_name == "":
            message = str(item_name_field_name) + " is required."
            logger.error(message)

            return HttpResponse(content=message, status=500)
        elif not is_item_name_valid(item_name):
            message = str(item_name_field_name) + " name must not contain " + get_bad_item_name_characters_in_string()
            logger.error(message)

            return HttpResponse(content=message, status=500)
    else:
        item_name = None

    item_id = None
    item2_id = None

    if "item_id" in request.POST:
        item_id = request.POST["item_id"]

    if "item2_id" in request.POST:
        item2_id = request.POST["item2_id"]

    return fields_to_save, item_name, item_id, item2_id


# It is assumed that select_object_models_info has been validated by this point.
# Should have been done in authenticate_and_validate_kwargs_view().
def convert_foreign_keys_to_objects(fields_to_save, select_object_models_info, action_type):
    if select_object_models_info is None:
        return True  # True just means it succeeded (there was nothing to do).

    for select_object_model_info in select_object_models_info:
        field_name1 = select_object_model_info[0]

        # If this entry is for inheritance and we are not doing a get_item call
        if (len(select_object_model_info) == 3 and action_type != GET):
            continue

        for field_name2, field_value in fields_to_save.iteritems():
            if field_name2 == field_name1:
                if field_value == "":
                    break

                try:
                    fields_to_save[field_name2] = select_object_model_info[1].objects.get(id=field_value)
                except ObjectDoesNotExist:
                    message = "Tried to load id " + field_value + " on model named \"" + \
                              select_object_model_info[1].__class__.__name__ + "\" to be used with field named \"" + \
                              field_name2 + "\"."
                    logger.error(message)

                    return HttpResponse(content=message, status=500)
                break
        else:
            message = "Could not find field name of \"" + field_name1 + "\" associated with the model named \"" + \
                      select_object_model_info.__class__.__name__ + "\" in fields_to_save. Check for typos in " + \
                      "kwargs and item_names. "
            logger.error(message)

            return HttpResponse(content=message, status=500)

    return True  # True just means it succeeded.


# It is assumed that select_object_models_info has been validated by this point.
# Should have been done in authenticate_and_validate_kwargs_view().
def convert_objects_to_foreign_keys(fields_to_load, select_object_models_info):
    if select_object_models_info is None:
        return True  # True just means it succeeded (there was nothing to do).

    for select_object_model_info in select_object_models_info:
        field_name1 = select_object_model_info[0]

        for field_name2, field_value in fields_to_load.iteritems():
            if field_name2 == field_name1:
                try:
                    fields_to_load[field_name2] = field_value.id
                except AttributeError:
                    message = "Tried to get id from model but \"" + field_value.__class__.__name__ + \
                              "\" is not a model. Please check kwargs and item_names for a field named \"" + \
                              field_name2 + "\" and check for typos."
                    logger.error(message)

                    return HttpResponse(content=message, status=500)
                break
        else:
            message = "Could not find field name of \"" + field_name1 + "\" associated with the model named \"" + \
                      select_object_model_info.__class__.__name__ + "\" in fields_to_load. Check for typos in " + \
                      "kwargs and item_names. "
            logger.error(message)

            return HttpResponse(content=message, status=500)

    return True  # True just means it succeeded (there was nothing to do).