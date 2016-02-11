import json

from django.db.models import ProtectedError
from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from maced.utils.constants import ADD, EDIT, MERGE, GET, DELETE, AUTHENTICATE, ALL_ACTION_TYPES, CLONE, INFO
from maced.utils.errors import MacedProgrammingError

from maced.utils.misc import make_random_id, serialize_item_action_data
from maced.utils.model_merging import merge_model_objects
from maced.views.function_based.helper_views import \
    authenticate_and_validate_kwargs_view, get_fields_and_item_name_from_post_view, convert_foreign_keys_to_objects, \
    convert_objects_to_foreign_keys


@transaction.atomic
@csrf_exempt
def maced_view(request, **kwargs):
    if "need_authentication" in kwargs:
        need_authentication = kwargs["need_authentication"]

        if not isinstance(need_authentication, bool):
            return HttpResponse(content="need_authentication must be a bool. Please check your kwargs.", status=500)
    else:
        need_authentication = True

    if "action_type" not in request.POST:
        return HttpResponse(content="action_type is missing from the post.", status=500)

    action_type = request.POST["action_type"]

    if action_type not in ALL_ACTION_TYPES:
        return HttpResponse(content="action_type of \"" + str(action_type) + "\" is not valid.", status=500)

    data = {}

    if action_type == MERGE:
        pass
    elif action_type == ADD:
        pass
    elif action_type == CLONE:
        return HttpResponse(content="Clone is not supported yet", status=500)
    elif action_type == EDIT:
        pass
    elif action_type == DELETE:
        pass
    elif action_type == GET:
        pass
    elif action_type == INFO:
        return HttpResponse(content="Info is not supported yet", status=500)
    elif action_type == AUTHENTICATE:
        if request.user.is_authenticated() or not need_authentication:
            data["authenticated"] = True
        else:
            data["authenticated"] = False

        return HttpResponse(content=json.dumps(data))
    else:
        raise MacedProgrammingError(
            "action_type is valid but is not being supported. This is a problem with maced. Please notify us at " +
            "https://github.com/Macainian/Django-Maced/issues"
        )


def add_item_view(request, **kwargs):
    # need_authentication is a bool that defaults to True and is used to determined whether a login is required
    # item_name_field_name is what the name value will correspond to in the database. This defaults to name.
    #       It will be used like ObjectToCreate(name=some_name), where name is the default value but it could be
    #       something else.
    # item_model is the model that the item is referring to. This is the class, not an instance.
    # data is the necessary info to send back through the ajax call in order to handle the frontend properly.
    action_type = ADD

    result = authenticate_and_validate_kwargs_view(request, action_type, **kwargs)

    # This will be a tuple as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(result, tuple):
        return result

    data = result[0]
    item_name_field_name = result[1]
    item_model = result[2]
    select_object_models_info = result[3]

    result = get_fields_and_item_name_from_post_view(request, item_model, item_name_field_name)

    # This will be a tuple as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(result, tuple):
        return result

    fields_to_save = result[0]
    item_name = result[1]

    result = convert_foreign_keys_to_objects(fields_to_save, select_object_models_info, action_type)

    # This will be a bool as long as it succeeded, otherwise it will be an HttpResponse. Since there are no safe
    # failures for this, there will never need to be a False returned.
    if not isinstance(result, bool):
        return result

    try:
        item = item_model.objects.create(**fields_to_save)
    except IntegrityError as error:
        return HttpResponse(
            content="An object related to this already exists or there is a problem with this item: " + str(error),
            status=500
        )
    except ValueError as error:
        return HttpResponse(
            content="An invalid value was received for a field, if you are using select-object, be sure to supply the "
                    "select_object_models_info list in the kwargs. Reported error: " + str(error),
            status=500
        )

    data["id"] = item.id
    data["name"] = item_name

    data_json_string = serialize_item_action_data(data)

    # This will be a string as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(data_json_string, (str, unicode)):
        return data_json_string

    return HttpResponse(content=data_json_string)


@transaction.atomic
@csrf_exempt
def edit_item_view(request, item_id, **kwargs):
    # need_authentication is a bool that defaults to True and is used to determined whether a login is required
    # item_type_name_field_name is what the name value will correspond to in the database. This defaults to name.
    #       It will be used like ObjectToCreate(name=some_name), where name is the default value but it could be
    #       something else.
    # item_model is the model that the item is referring to. This is the class, not an instance.
    # data is the necessary info to send back through the ajax call in order to handle the frontend properly.
    action_type = EDIT

    result = authenticate_and_validate_kwargs_view(request, action_type, **kwargs)

    # This will be a tuple as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(result, tuple):
        return result

    data = result[0]
    item_name_field_name = result[1]
    item_model = result[2]
    select_object_models_info = result[3]

    result = get_fields_and_item_name_from_post_view(request, item_model, item_name_field_name)

    # This will be a tuple as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(result, tuple):
        return result

    fields_to_save = result[0]
    item_name = result[1]

    data["name"] = item_name

    result = convert_foreign_keys_to_objects(fields_to_save, select_object_models_info, action_type)

    # This will be a bool as long as it succeeded, otherwise it will be an HttpResponse. Since there are no safe
    # failures for this, there will never need to be a False returned.
    if not isinstance(result, bool):
        return result

    try:
        item_model.objects.filter(id=item_id).update(**fields_to_save)
    except IntegrityError as error:
        return HttpResponse(
            content="An object related to this already exists or there is a problem with this item: " + str(error),
            status=500
        )
    except ValueError as error:
        return HttpResponse(
            content="An invalid value was received for a field, if you are using select-object, be sure to supply the "
                    "select_object_models_info list in the kwargs. Reported error: " + str(error),
            status=500
        )

    data_json_string = serialize_item_action_data(data)

    # This will be a string as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(data_json_string, (str, unicode)):
        return data_json_string

    return HttpResponse(content=data_json_string)


@transaction.atomic
@csrf_exempt
def merge_item_view(request, item1_id, item2_id, **kwargs):
    # need_authentication is a bool that defaults to True and is used to determined whether a login is required
    # item_type_name_field_name is what the name value will correspond to in the database. This defaults to name.
    #       It will be used like ObjectToCreate(name=some_name), where name is the default value but it could be
    #       something else.
    # item_model is the model that the item is referring to. This is the class, not an instance.
    # data is the necessary info to send back through the ajax call in order to handle the frontend properly.
    action_type = MERGE

    result = authenticate_and_validate_kwargs_view(request, action_type, **kwargs)

    # This will be a tuple as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(result, tuple):
        return result

    data = result[0]
    item_name_field_name = result[1]
    item_model = result[2]
    select_object_models_info = result[3]

    result = get_fields_and_item_name_from_post_view(request, item_model, item_name_field_name)

    # This will be a tuple as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(result, tuple):
        return result

    fields_to_save = result[0]
    item_name = result[1]

    result = convert_foreign_keys_to_objects(fields_to_save, select_object_models_info, action_type)

    # This will be a bool as long as it succeeded, otherwise it will be an HttpResponse. Since there are no safe
    # failures for this, there will never need to be a False returned.
    if not isinstance(result, bool):
        return result

    # Check that item1 exists
    if not item_model.objects.filter(id=item1_id).exists():
        return HttpResponse(content="The item with id \"" + str(item1_id) + "\" does not exist. Did someone delete it?", status=500)

    # Load item2
    try:
        item2 = item_model.objects.get(id=item2_id)
        random_name = make_random_id(10)

        while len(item_model.objects.filter(**{item_name_field_name: random_name})) > 0:
            random_name = make_random_id(10)

        setattr(item2, item_name_field_name, random_name)
        item2.save()
    except ObjectDoesNotExist:
        return HttpResponse(content="The item with id \"" + str(item1_id) + "\" does not exist. Did someone delete it?", status=500)

    # Fill item1 with whatever came from the frontend. This will be the primary item.
    try:
        item_model.objects.filter(id=item1_id).update(**fields_to_save)
    except IntegrityError as error:
        return HttpResponse(
            content="An object related to this already exists or there is a problem with this item: " + str(error),
            status=500
        )
    except ValueError as error:
        return HttpResponse(
            content="An invalid value was received for a field, if you are using select-object, be sure to supply the "
                    "select_object_models_info list in the kwargs. Reported error: " + str(error),
            status=500
        )

    # Load item1
    item1 = item_model.objects.get(id=item1_id)

    # Merge em :)
    merge_model_objects(item1, item2)

    data["name"] = item_name
    data["id"] = item1_id

    data_json_string = serialize_item_action_data(data)

    # This will be a string as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(data_json_string, (str, unicode)):
        return data_json_string

    return HttpResponse(content=data_json_string)


@transaction.atomic
@csrf_exempt
def delete_item_view(request, item_id, **kwargs):
    # need_authentication is a bool that defaults to True and is used to determined whether a login is required
    # item_model is the model that the item is referring to. This is the class, not an instance.
    # data is the necessary info to send back through the ajax call in order to handle the frontend properly.
    action_type = DELETE

    result = authenticate_and_validate_kwargs_view(request, action_type, **kwargs)

    # This will be a tuple as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(result, tuple):
        return result

    data = result[0]
    item_name_field_name = result[1]  # Unnecessary here
    item_model = result[2]
    select_object_models_info = result[3]  # Unnecessary here

    try:
        item_model.objects.get(id=item_id).delete()
    except ProtectedError as error:
        return HttpResponse(content="This object is in use: " + str(error), status=500)

    data_json_string = serialize_item_action_data(data)

    # This will be a string as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(data_json_string, (str, unicode)):
        return data_json_string

    return HttpResponse(content=data_json_string)


@csrf_exempt
def get_item_view(request, item_id, **kwargs):
    # need_authentication is a bool that defaults to True and is used to determined whether a login is required
    # item_type_name_field_name is what the name value will correspond to in the database. This defaults to name.
    #       It will be used like ObjectToCreate(name=some_name), where name is the default value but it could be
    #       something else.
    # item_model is the model that the item is referring to. This is the class, not an instance.
    # data is the necessary info to send back through the ajax call in order to handle the frontend properly.
    action_type = GET

    result = authenticate_and_validate_kwargs_view(request, action_type, **kwargs)

    # This will be a tuple as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(result, tuple):
        return result

    data = result[0]
    item_name_field_name = result[1]  # Unnecessary here
    item_model = result[2]
    select_object_models_info = result[3]

    item = item_model.objects.get(id=item_id)

    fields_to_load = {}

    # Get all fields on the model
    fields_info = item_model._meta.fields

    # Build a list of potential fields to fill in
    for field_info in fields_info:
        fields_to_load[field_info.name] = getattr(item, field_info.name)

    convert_objects_to_foreign_keys(fields_to_load, select_object_models_info)

    data["fields"] = fields_to_load

    data_json_string = serialize_item_action_data(data)

    # This will be a string as long as it succeeded, otherwise it will be an HttpResponse
    if not isinstance(data_json_string, (str, unicode)):
        return data_json_string

    return HttpResponse(content=data_json_string)