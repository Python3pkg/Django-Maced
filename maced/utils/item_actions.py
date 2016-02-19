import json
import logging

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import ProtectedError
from django.http import HttpResponse
from django.db import IntegrityError

from maced.utils.item_action_helpers import convert_objects_to_foreign_keys
from maced.utils.misc import make_random_id, is_authenticated
from maced.utils.model_merging import merge_model_objects


logger = logging.getLogger("maced")


def merge_item(item_model, fields_to_save, item_name, item1_id, item2_id, item_name_field_name):
    data = {}

    # Check that item1 exists
    if not item_model.objects.filter(id=item1_id).exists():
        message = "The item with id \"" + str(item1_id) + "\" does not exist. Did someone delete it?"
        logger.error(message)

        return HttpResponse(content=message, status=500)

    # Load item2
    try:
        item2 = item_model.objects.get(id=item2_id)
        random_name = make_random_id(10)

        while len(item_model.objects.filter(**{item_name_field_name: random_name})) > 0:
            random_name = make_random_id(10)

        setattr(item2, item_name_field_name, random_name)
        item2.save()
    except ObjectDoesNotExist:
        message = "The item with id \"" + str(item1_id) + "\" does not exist. Did someone delete it?"
        logger.error(message)

        return HttpResponse(content=message, status=500)

    # Fill item1 with whatever came from the frontend. This will be the primary item.
    try:
        item_model.objects.filter(id=item1_id).update(**fields_to_save)
    except IntegrityError as error:
        message = "An object related to this already exists or there is a problem with this item. Reported error: " + \
                  str(error)
        logger.error(message)

        return HttpResponse(content=message, status=500)
    except ValueError as error:
        message = "An invalid value was received for a field, if you are using select-object, be sure to supply " + \
                  "the select_object_models_info list in the kwargs. Reported error: " + str(error),
        logger.error(message)

        return HttpResponse(content=message, status=500)

    # Load item1
    item1 = item_model.objects.get(id=item1_id)

    # Merge em :)
    merge_model_objects(item1, item2)

    data["name"] = item_name

    return data


def add_item(item_model, fields_to_save, item_name):
    data = {}

    try:
        item = item_model.objects.create(**fields_to_save)
    except IntegrityError as error:
        message = "An object related to this already exists or there is a problem with this item. Reported error: " + \
                  str(error),
        logger.error(message)

        return HttpResponse(content=message, status=500)
    except ValueError as error:
        message = "An invalid value was received for a field, if you are using select-object, be sure to supply " + \
                  "the select_object_models_info list in the kwargs. Reported error: " + str(error),
        logger.error(message)

        return HttpResponse(content=message, status=500)

    data["id"] = item.id
    data["name"] = item_name

    return data


def clone_item():
    message = "Clone is not supported yet"
    logger.error(message)

    return HttpResponse(content=message, status=500)


def edit_item(item_model, fields_to_save, item_name, item_id):
    data = {}

    data["name"] = item_name

    try:
        item_model.objects.filter(id=item_id).update(**fields_to_save)
    except IntegrityError as error:
        message = "An object related to this already exists or there is a problem with this item. Reported error: " + \
                  str(error),
        logger.error(message)

        return HttpResponse(content=message, status=500)
    except ValueError as error:
        message = "An invalid value was received for a field, if you are using select-object, be sure to supply " + \
                  "the select_object_models_info list in the kwargs. Reported error: " + str(error),
        logger.error(message)

        return HttpResponse(content=message, status=500)

    return data


def delete_item(item_model, item_id):
    data = {}

    try:
        item_model.objects.get(id=item_id).delete()
    except ProtectedError as error:
        message = "This object is in use. Reported error: " + str(error)
        logger.error(message)

        return HttpResponse(content=message, status=500)

    return data


def get_item(item_model, select_object_models_info, item_id):
    data = {}

    if not item_model.objects.filter(id=item_id).exists():
        message = "The item with id \"" + str(item_id) + "\" does not exist. Did someone delete it?"
        logger.error(message)

        return HttpResponse(content=message, status=500)

    item = item_model.objects.get(id=item_id)

    fields_to_load = {}

    # Get all fields on the model
    fields_info = item_model._meta.fields

    # Build a list of potential fields to fill in
    for field_info in fields_info:
        fields_to_load[field_info.name] = getattr(item, field_info.name)

    conversion_result = convert_objects_to_foreign_keys(fields_to_load, select_object_models_info)

    # This will be a bool as long as it succeeded, otherwise it will be an HttpResponse. Since there are no safe
    # failures for this, there will never need to be a False returned.
    if not isinstance(conversion_result, bool):
        return conversion_result

    data["fields"] = fields_to_load

    return data


# That's right, info is now a verb. I coined it. :)
# How to use the word "info" in a sentence:
#       Boss: Our competitors have just released a new product for cleaning toilets.
#       John: Right. I'm on it boss. I'll go get the information on that product.
#       Boss: No, John. I need much more than that.
#       John: Right. I'll info that product for you and you'll have even the hidden details.
#       Boss: Now that's what I'm talking about John. You're getting a promotion.
#       John: Sweet. Can I also have the office on the corner that I...
#       Boss: John, you're fired. Sam, my man, our competitors have just released a new product for cleaning toilets.
def info_item():
    message = "Info is not supported yet"
    logger.error(message)

    return HttpResponse(content=message, status=500)


def get_authentication(request, need_authentication):
    data = {}
    data["authenticated"] = is_authenticated(request=request, need_authentication=need_authentication)

    return HttpResponse(content=json.dumps(data))